Rails.application.routes.draw do
  # Health check
  get '/health', to: proc { [200, {}, [{ status: 'ok' }.to_json]] }

  oidc_cfg = Rails.application.config.try(:auth)&.dig(:oidc) || {}
  oidc_enabled = oidc_cfg[:enabled] == true || ENV['OIDC_ENABLED'] == 'true'

  auth_controllers = {
    sessions: 'auth/sessions',
    registrations: 'auth/registrations',
    confirmations: 'auth/confirmations'
  }
  auth_controllers[:omniauth_callbacks] = 'auth/omniauth_callbacks' if oidc_enabled

  devise_for :users,
    path: 'auth',
    path_names: {
      sign_in: 'login',
      sign_out: 'logout',
      registration: 'register'
    },
    controllers: auth_controllers

  # OIDC Callback
  get '/auth/oidc/callback', to: 'auth/omniauth_callbacks#openid_connect'
  post '/auth/oidc/callback', to: 'auth/omniauth_callbacks#openid_connect'

  # API V1 namespace
  namespace :api do
    namespace :v1 do
      # Current user
      get '/me', to: 'users#me'
      put '/me', to: 'users#update_me'

      # Projects
      resources :projects do
        member do
          get :members
          post :add_member
          put 'members/:user_id', to: 'projects#update_member', as: :update_member
          delete 'members/:user_id', to: 'projects#remove_member', as: :remove_member
        end

        resources :sprints do
          member do
            post :start
            post :complete
          end
        end

        resources :epics
        resources :labels
        resources :issues, only: [:index, :create] do
          collection do
            post :import
          end
        end
        resources :reports, only: [] do
          collection do
            get :burndown
            get :velocity
            get :issue_summary
          end
        end
        resources :imports, only: [:create]
      end

      # Issues (full CRUD at top level for cross-project convenience)
      resources :issues do
        member do
          patch :move
          patch :reorder
          patch :assign
        end
        resources :comments
        resources :attachments, only: [:index, :create, :destroy]
        resources :links, controller: 'issue_links', only: [:index, :create, :destroy]
      end

      # Comments (also accessible standalone)
      resources :comments, only: [:show, :update, :destroy]
    end
  end

  # Rswag UI and API
  mount Rswag::Ui::Engine => '/api-docs'
  mount Rswag::Api::Engine => '/api-docs'
end
