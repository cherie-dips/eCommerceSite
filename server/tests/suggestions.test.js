const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { startTestServer, stopTestServer, api, createUser, config } = require("./helpers");
const suggestions = require("../routes/suggestions");

before(startTestServer);
after(stopTestServer);

const IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const body = { image: IMAGE, imageInfo: { width: 200, height: 100, hasTransparency: true, colors: ["#e11d48"] }, product: { name: "Mug" }, printArea: { height: 800, widthCm: 9 }, brandText: "Acme" };

test("AI suggestions are off without an API key", async () => {
  const { token } = await createUser();
  assert.deepEqual((await api("GET", "/api/design-suggestions/status")).data, { ai: false });
  assert.equal((await api("POST", "/api/design-suggestions/ai", { body, token })).status, 404);
});

test("AI layouts are checked and tidied before the website gets them", async () => {
  config.ai.enabled = true;
  let request;
  suggestions.setClientForTests({
    beta: {
      messages: {
        create: async (params) => {
          request = params;
          return {
            stop_reason: "end_turn",
            content: [{
              type: "text",
              text: JSON.stringify({
                suggestions: [
                  { name: "Bold", description: "Big logo", layers: [
                    { type: "rect", x: 500, y: 400, width: 5000, height: 300, rotation: 0, opacity: 1, fill: "red", stroke: "", strokeWidth: 0, cornerRadius: 20 },
                    { type: "image", x: 500, y: 400, width: 600, rotation: 0, opacity: 1, frame: "none" },
                    { type: "text", text: "Acme", x: 500, y: 700, width: 800, rotation: 0, fontFamily: "Comic Sans", fontSize: 999, fontStyle: "bold", fill: "#112233", align: "center", letterSpacing: 2 },
                  ] },
                  { name: "No image", description: "x", layers: [{ type: "text", text: "Hi", x: 1, y: 1, width: 100, rotation: 0, fontFamily: "Inter", fontSize: 50, fontStyle: "normal", fill: "#000000", align: "center", letterSpacing: 0 }] },
                ],
              }),
            }],
          };
        },
      },
    },
  });
  const { token } = await createUser();
  const r = await api("POST", "/api/design-suggestions/ai", { body, token });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.suggestions.length, 1); // the layout without the customer's image is dropped
  const [rect, image, text] = r.data.suggestions[0].layers;
  assert.equal(rect.width, 1000);
  assert.equal(rect.fill, "#7c0034");
  assert.equal(image.height, 300); // follows the image's 2:1 shape
  assert.equal(text.fontFamily, "Inter");
  assert.equal(text.fontSize, 240);

  // What was sent to Claude
  assert.equal(request.model, "claude-opus-5-5");
  assert.equal(request.output_config.format.type, "json_schema");
  assert.equal(request.messages[0].content[0].type, "image");
  assert.match(request.messages[0].content[1].text, /"brandText": "Acme"/);
});

test("a refusal or bad image gives a clear message", async () => {
  config.ai.enabled = true;
  suggestions.setClientForTests({ beta: { messages: { create: async () => ({ stop_reason: "refusal", content: [] }) } } });
  const { token } = await createUser();
  let r = await api("POST", "/api/design-suggestions/ai", { body, token });
  assert.equal(r.status, 422);
  r = await api("POST", "/api/design-suggestions/ai", { body: { ...body, image: "data:text/html;base64,PHNjcmlwdD4=" }, token });
  assert.equal(r.status, 400);
});
