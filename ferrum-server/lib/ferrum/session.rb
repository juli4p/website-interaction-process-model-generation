# frozen_string_literal: true

require_relative 'browser_factory'
require_relative 'actions/navigation'
require_relative 'actions/keyboard'
require_relative 'actions/click'
require_relative 'actions/select'
require_relative 'actions/clipboard'
require_relative 'actions/page_snapshot'
require_relative 'actions/screenshot'
require_relative 'actions/element'

class FerrumSession
  attr_reader :id, :browser, :page, :step_id

  def initialize(id:, headless: true, window_size: [1440, 1000], timeout: 10, debug: false, server_logger: nil)
    @id = id
    @server_logger = server_logger
    @step_id = 0

    factory = Ferrum::BrowserFactory.new(
      id: id,
      headless: headless,
      window_size: window_size,
      timeout: timeout,
      debug: debug
    )

    @browser = factory.browser
    @page = @browser.create_page
    @ferrum_logger = factory.logger

    log(:info, 'initialized', headless: headless, window_size: window_size, timeout: timeout, debug: debug)
  end

  # increments and returns new step_id
  def next_step_id
    @step_id += 1
  end

  def close
    log(:info, 'closing')
    @browser&.quit
  ensure
    @ferrum_logger&.close
  end

  def navigate(url)
    Ferrum::Actions::Navigation.new(self).open_url(url)
  end

  def type_text(**options)
    Ferrum::Actions::Keyboard.new(self).type_text(**options)
  end

  def press_special_key(key, **options)
    Ferrum::Actions::Keyboard.new(self).press_special_key(key, **options)
  end

  def click(**options)
    Ferrum::Actions::Click.new(self).click(**options)
  end

  def select_option(**options)
    Ferrum::Actions::Select.new(self).select_option(**options)
  end

  def copy(**options)
    Ferrum::Actions::Clipboard.new(self).copy(**options)
  end

  def cut(**options)
    Ferrum::Actions::Clipboard.new(self).cut(**options)
  end

  def element_outer_html(**options)
    Ferrum::Actions::Element.new(self).outer_html(**options)
  end

  def page_snapshot
    Ferrum::Actions::PageSnapshot.new(self).page_snapshot
  end

  def screenshot(**options)
    Ferrum::Actions::Screenshot.new(self).screenshot(**options)
  end

  def current_url
    @page.current_url
  rescue StandardError => e
    log(:error, 'current_url_failed', error: e)
    raise
  end

  def title
    @page.title
  rescue StandardError => e
    log(:error, 'title_failed', error: e)
    raise
  end

  def log(level, action, error: nil, **fields)
    return unless @server_logger

    payload = {
      action: action,
      session_id: @id,
      step_id: @step_id,
      **fields
    }

    if error
      payload[:error_class] = error.class.name
      payload[:error_message] = error.message
    end

    @server_logger.log(level, 'ferrum_session', **payload)
  end
end
