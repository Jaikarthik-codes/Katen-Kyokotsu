import { deviceTier } from "./device";

it.each([
  [{ hardwareConcurrency: 2 }, "low"],
  [{ deviceMemory: 2, hardwareConcurrency: 8 }, "low"],
  [{ connection: { saveData: true }, hardwareConcurrency: 8 }, "low"],
  [{ hardwareConcurrency: 8, deviceMemory: 8 }, "high"],
])("tier %o", (nav, tier) => {
  expect(deviceTier(nav as never)).toBe(tier);
});
