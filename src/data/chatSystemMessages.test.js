import { describe, it, expect } from "vitest";
import { classifySender } from "./chatSystemMessages.js";

describe("classifySender", () => {
  const peachId = "mePubKey";
  const counterpartyId = "themPubKey";

  it("classifies the current user as 'me'", () => {
    expect(classifySender(peachId, { peachId, counterpartyId })).toBe("me");
  });

  it("classifies the literal 'system' sender as 'system'", () => {
    expect(classifySender("system", { peachId, counterpartyId })).toBe(
      "system",
    );
  });

  it("classifies the counterparty as 'them'", () => {
    expect(classifySender(counterpartyId, { peachId, counterpartyId })).toBe(
      "them",
    );
  });

  it("classifies an unknown sender as 'mediator' when counterparty is known", () => {
    expect(
      classifySender("someMediatorPubKey", { peachId, counterpartyId }),
    ).toBe("mediator");
  });

  it("classifies an unknown sender as 'mediator' when counterparty is unknown", () => {
    expect(classifySender("someMediatorPubKey", { peachId })).toBe("mediator");
  });
});
