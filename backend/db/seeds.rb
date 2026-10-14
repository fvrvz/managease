# frozen_string_literal: true

puts '== Seeding ManagEase Database =='

# Default User
admin = User.find_or_create_by!(email: 'admin@managease.local') do |u|
  u.name = 'Alex Rivera'
  u.password = 'password123'
  u.password_confirmation = 'password123'
end
puts "Created User: #{admin.email} (password123)"

dev_user = User.find_or_create_by!(email: 'sarah.chen@managease.local') do |u|
  u.name = 'Sarah Chen'
  u.password = 'password123'
  u.password_confirmation = 'password123'
end

qa_user = User.find_or_create_by!(email: 'marcus.vance@managease.local') do |u|
  u.name = 'Marcus Vance'
  u.password = 'password123'
  u.password_confirmation = 'password123'
end

# Default Project
project = Project.find_or_create_by!(key: 'MNG') do |p|
  p.name = 'ManagEase Core Platform'
  p.description = 'Jira-style agile project planning, Kanban board, and burndown analytics'
  p.owner = admin
  p.status = :active
end
puts "Created Project: #{project.name} (#{project.key})"

ProjectMember.find_or_create_by!(project: project, user: dev_user) { |pm| pm.role = :member }
ProjectMember.find_or_create_by!(project: project, user: qa_user) { |pm| pm.role = :member }

# Labels
frontend_label = project.labels.find_or_create_by!(name: 'frontend') { |l| l.color = '#3B82F6' }
backend_label = project.labels.find_or_create_by!(name: 'backend') { |l| l.color = '#10B981' }
auth_label = project.labels.find_or_create_by!(name: 'auth') { |l| l.color = '#8B5CF6' }
ui_label = project.labels.find_or_create_by!(name: 'ui/ux') { |l| l.color = '#F59E0B' }
bug_label = project.labels.find_or_create_by!(name: 'critical-bug') { |l| l.color = '#EF4444' }

# Epics
epic1 = project.epics.find_or_create_by!(name: 'User Authentication & SSO') do |e|
  e.description = 'OAuth2 / OpenID Connect enterprise integration and local fallback auth'
  e.color = '#8B5CF6'
  e.status = :in_progress
  e.start_date = 1.week.ago
  e.end_date = 2.weeks.from_now
  e.assignee = admin
end

epic2 = project.epics.find_or_create_by!(name: 'Interactive Kanban Board') do |e|
  e.description = 'Drag-and-drop columns, quick issue creation, swimlanes, and filtering'
  e.color = '#3B82F6'
  e.status = :in_progress
  e.start_date = 3.days.ago
  e.end_date = 3.weeks.from_now
  e.assignee = dev_user
end

epic3 = project.epics.find_or_create_by!(name: 'Sprint Analytics & Burndown') do |e|
  e.description = 'Burndown graphs, velocity charts, and Excel plan importer'
  e.color = '#10B981'
  e.status = :todo
  e.start_date = 1.week.from_now
  e.end_date = 4.weeks.from_now
  e.assignee = qa_user
end

# Sprints
sprint1 = project.sprints.find_or_create_by!(name: 'Sprint 1 - Foundation & Board') do |s|
  s.goal = 'Complete Kanban board drag-drop, local auth, and issue management'
  s.status = :active
  s.start_date = 5.days.ago
  s.end_date = 9.days.from_now
end

sprint2 = project.sprints.find_or_create_by!(name: 'Sprint 2 - Analytics & Excel') do |s|
  s.goal = 'Implement burndown calculations, roadmap timeline, and Excel plan importer'
  s.status = :planning
  s.start_date = 10.days.from_now
  s.end_date = 24.days.from_now
end

# Issues for Sprint 1
issues_data = [
  {
    title: 'Configure OpenID Connect / OAuth2 SSO integration',
    description: 'Allow enterprise SSO with Google, Keycloak, or Auth0 with fallback to local Devise authentication.',
    issue_type: :story,
    status: :done,
    priority: :high,
    story_points: 5,
    sprint: sprint1,
    epic: epic1,
    assignee: admin,
    labels: [backend_label, auth_label],
    resolved_at: 2.days.ago
  },
  {
    title: 'Implement drag-and-drop Kanban board columns',
    description: 'Provide smooth HTML5 drag-and-drop for cards between Todo, In Progress, In Review, and Done columns.',
    issue_type: :story,
    status: :in_progress,
    priority: :highest,
    story_points: 8,
    sprint: sprint1,
    epic: epic2,
    assignee: dev_user,
    labels: [frontend_label, ui_label]
  },
  {
    title: 'Card elevation and visual status indicators',
    description: 'Display priority icons, story point badge, assignee avatar, and colored tags matching Jira design.',
    issue_type: :task,
    status: :in_review,
    priority: :medium,
    story_points: 3,
    sprint: sprint1,
    epic: epic2,
    assignee: dev_user,
    labels: [frontend_label, ui_label]
  },
  {
    title: 'Fix issue position ordering during column drag',
    description: 'Ensure acts_as_list maintains exact order sequence when cards are moved within or across columns.',
    issue_type: :bug,
    status: :todo,
    priority: :high,
    story_points: 3,
    sprint: sprint1,
    epic: epic2,
    assignee: admin,
    labels: [backend_label, bug_label]
  },
  {
    title: 'Sprint burndown chart calculation service',
    description: 'Compute ideal burndown versus actual completed points by day for the active sprint.',
    issue_type: :story,
    status: :todo,
    priority: :high,
    story_points: 5,
    sprint: sprint1,
    epic: epic3,
    assignee: qa_user,
    labels: [backend_label]
  },
  {
    title: 'Excel plan upload and automatic setup generator',
    description: 'Support importing existing Excel/CSV project plans with automatic creation of sprints, epics, and cards.',
    issue_type: :story,
    status: :backlog,
    priority: :high,
    story_points: 8,
    sprint: sprint2,
    epic: epic3,
    assignee: dev_user,
    labels: [frontend_label, backend_label]
  },
  {
    title: 'Interactive Gantt-style Roadmap timeline',
    description: 'Visualize epics and milestone dates in a horizontal timeline view.',
    issue_type: :story,
    status: :backlog,
    priority: :medium,
    story_points: 5,
    sprint: sprint2,
    epic: epic3,
    assignee: qa_user,
    labels: [frontend_label]
  }
]

issues_data.each do |data|
  labels = data.delete(:labels) || []
  resolved_at = data.delete(:resolved_at)

  issue = project.issues.find_or_create_by!(title: data[:title]) do |i|
    i.attributes = data
    i.reporter = admin
    i.resolved_at = resolved_at
  end

  labels.each do |lbl|
    issue.labels << lbl unless issue.labels.include?(lbl)
  end
end

puts "== Seeded #{Issue.count} issues across #{Sprint.count} sprints and #{Epic.count} epics =="
