# frozen_string_literal: true

class IssueSerializer
  include JSONAPI::Serializer

  set_type :issue

  attributes :title, :description, :issue_type, :status, :priority,
             :story_points, :position, :due_date, :resolved_at,
             :created_at, :updated_at

  attribute :number do |issue|
    issue.number
  end

  attribute :issue_key do |issue|
    issue.issue_key
  end

  attribute :project_id do |issue|
    issue.project_id
  end

  attribute :sprint_id do |issue|
    issue.sprint_id
  end

  attribute :epic_id do |issue|
    issue.epic_id
  end

  attribute :assignee_id do |issue|
    issue.assignee_id
  end

  attribute :reporter_id do |issue|
    issue.reporter_id
  end

  attribute :subtasks_count do |issue|
    issue.subtasks.size
  end

  attribute :comments_count do |issue|
    issue.comments.size
  end

  belongs_to :project, serializer: ProjectSerializer
  belongs_to :sprint, serializer: SprintSerializer, optional: true
  belongs_to :epic, serializer: proc { EpicSerializer }, optional: true
  belongs_to :assignee, serializer: UserSerializer, optional: true
  belongs_to :reporter, serializer: UserSerializer, optional: true
  belongs_to :parent, serializer: IssueSerializer, optional: true
  has_many :subtasks, serializer: IssueSerializer
  has_many :labels, serializer: proc { LabelSerializer }
  has_many :comments, serializer: proc { CommentSerializer }
  has_many :attachments, serializer: proc { AttachmentSerializer }
end
