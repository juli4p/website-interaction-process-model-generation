post '/sessions/click' do
  content_type :json

  session, step_id, body =
    prepare_session_action!(Contracts::Click, action_type: 'click')

  options = body.slice(
    :strategy,
    :timeout,
    :interval,
    :rx,
    :ry,
    :debug_marker,
    :shift,
    :ctrl,
    :alt,
    :meta
  )

  result = session.click(
    selector_type: body[:selectorType],
    selector_segments: body[:selectorSegments],
    selector_indexes: body[:selectorIndexes],
    **options
  )

  action_response(
    session: session,
    step_id: step_id,
    action_type: 'click',
    selectorType: body[:selectorType],
    selectorSegments: body[:selectorSegments],
    selectorIndexes: body[:selectorIndexes],
    **result
  )
end
