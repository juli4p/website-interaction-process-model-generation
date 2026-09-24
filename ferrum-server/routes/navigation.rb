# frozen_string_literal: true

post '/sessions/navigate' do
  content_type :json

  session, step_id, body = prepare_session_action!(Contracts::Navigate, action_type: 'navigate')

  result = session.navigate(body.fetch(:url))

  action_response(
    session: session,
    step_id: step_id,
    action_type: 'navigate',
    **result
  )
end
