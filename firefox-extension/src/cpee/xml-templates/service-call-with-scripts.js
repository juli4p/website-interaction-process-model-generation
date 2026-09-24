const DESCRIPTION_NS = "http://cpee.org/ns/description/1.0";
const VALID_METHODS = new Set([":post", ":get", ":put", ":patch", ":delete"]);

export function createServiceCallWithScripts({
  id,
  endpoint = "",
  label = "",
  color = "",
  method = ":post",
  arguments: args = {},
  prepare = "",
  finalize = "",
  update = "",
  rescue = "",
}) {
  if (!VALID_METHODS.has(method)) {
    throw new Error(`Invalid method: ${method}`);
  }

  const xml = /* xml */ `
    <call xmlns="${DESCRIPTION_NS}" id="${id}" endpoint="${endpoint}">
        <parameters>
          <label/>
          <color/>
          <method></method>
          <arguments/>
        </parameters>
        <code>
          <signal>false</signal>
          <prepare/>
          <finalize output="result"/>
          <update output="result"/>
          <rescue output="result"/>
        </code>
        <annotations>
          <_generic/>
          <_logging_behavior>
            <_exclude>false</_exclude>
            <_include>false</_include>
          </_logging_behavior>
          <_timing>
            <_timing_weight/>
            <_timing_avg/>
            <explanations/>
          </_timing>
          <_shifting>
            <_shifting_type>Duration</_shifting_type>
          </_shifting>
          <_context_data_analysis>
            <probes/>
            <ips/>
          </_context_data_analysis>
          <report>
            <url/>
          </report>
          <_notes>
            <_notes_general/>
          </_notes>
        </annotations>
        <documentation>
          <input/>
          <output/>
          <implementation>
            <description/>
          </implementation>
          <code>
            <description/>
          </code>
        </documentation>
    </call>
`;

  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const callNode = doc.documentElement;

  callNode.querySelector("label").textContent = label;
  callNode.querySelector("color").textContent = color;
  callNode.querySelector("method").textContent = method;
  callNode.querySelector("prepare").textContent = prepare;
  callNode.querySelector("finalize").textContent = finalize;
  callNode.querySelector("update").textContent = update;
  callNode.querySelector("rescue").textContent = rescue;

  const argsNode = callNode.querySelector("arguments");
  for (const [key, value] of Object.entries(args)) {
    const argElement = doc.createElementNS(DESCRIPTION_NS, key);
    argElement.textContent = String(value);
    argsNode.appendChild(argElement);
  }

  return callNode;
}
