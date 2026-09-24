# frozen_string_literal: true

require 'ferrum'
require 'fileutils'

module Ferrum
  class BrowserFactory
    attr_reader :browser, :logger

    def initialize(id:, headless:, window_size:, timeout:, debug: false)
      @logger = nil

      options = {
        headless: headless,
        timeout: timeout,
        window_size: window_size
      }

      if debug
        FileUtils.mkdir_p('logs')
        @logger = File.open("logs/ferrum_#{id}.log", 'a')
        @logger.sync = true
        options[:logger] = @logger
      end

      @browser = ::Ferrum::Browser.new(**options)
    end
  end
end
