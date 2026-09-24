import { FERRUM_SERVER_BASE_URL } from "../config.js";
const BASE_URL = FERRUM_SERVER_BASE_URL.replace(/\/+$/, "");

export const BASE_TEMPLATE = /* xml*/ `
<testset xmlns="http://cpee.org/ns/properties/2.0">
  <executionhandler>ruby</executionhandler>
  <dataelements>
    <id/>
  </dataelements>
  <endpoints>
    <sessions>${BASE_URL}/sessions</sessions>
    <type_text>${BASE_URL}/sessions/type_text</type_text>
    <press_special_key>${BASE_URL}/sessions/press_special_key</press_special_key>
    <click>${BASE_URL}/sessions/click</click>
    <select>${BASE_URL}/sessions/select</select>
    <navigate>${BASE_URL}/sessions/navigate</navigate>
    <copy>${BASE_URL}/sessions/copy</copy>
    <cut>${BASE_URL}/sessions/cut</cut>
    <screenshot>${BASE_URL}/sessions/screenshot</screenshot>
    <element>${BASE_URL}/sessions/element</element>
    <debug_openInBrowser>${BASE_URL}/sessions/{id}/debug</debug_openInBrowser>
  </endpoints>
  <attributes>
    <info>Enter info here</info>
    <modeltype>CPEE</modeltype>
    <theme>preset</theme>
  </attributes>
  <description>
    <description xmlns="http://cpee.org/ns/description/1.0">
    </description>
  </description>
  <transformation>
    <description type="copy"/>
    <dataelements type="none"/>
    <endpoints type="none"/>
  </transformation>
</testset>
`;
