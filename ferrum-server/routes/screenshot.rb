# frozen_string_literal: true

post '/sessions/screenshot' do
  content_type :json

  session, step_id, body =
    prepare_session_action!(Contracts::Screenshot, action_type: 'screenshot')

  result = session.screenshot(
    full: body.fetch(:full, false)
  )

  action_response(
    session: session,
    step_id: step_id,
    action_type: 'screenshot',
    full: body.fetch(:full, false),
    **result
  )
end
