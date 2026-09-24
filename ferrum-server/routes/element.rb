post '/sessions/element' do
  content_type :json

  session, step_id, body =
    prepare_session_action!(Contracts::ElementOuterHtml, action_type: 'element')

  options = body.slice(
    :timeout,
    :interval
  )

  result = session.element_outer_html(
    selector_type: body[:selectorType],
    selector_segments: body[:selectorSegments],
    selector_indexes: body[:selectorIndexes],
    **options
  )

  action_response(
    session: session,
    step_id: step_id,
    action_type: 'element',
    selectorType: body[:selectorType],
    selectorSegments: body[:selectorSegments],
    selectorIndexes: body[:selectorIndexes],
    **result
  )
end
