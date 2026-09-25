import { describe, expect, it } from "vitest";
import { classifyHost } from "./host";

describe("classifyHost", () => {
  it("routes tenant subdomains", () => {
    expect(classifyHost("hodan.localhost:3000", "localhost")).toEqual({ kind: "tenant", slug: "hodan" });
    expect(classifyHost("Hodan-Estates.propman.so", "propman.so")).toEqual({ kind: "tenant", slug: "hodan-estates" });
  });

  it("routes the admin subdomain", () => {
    expect(classifyHost("admin.localhost:3000", "localhost")).toEqual({ kind: "admin" });
    expect(classifyHost("admin.propman.so", "propman.so")).toEqual({ kind: "admin" });
  });

  it("treats the bare domain, www, nested and foreign hosts as the root site", () => {
    for (const host of ["localhost:3000", "propman.so", "www.propman.so", "a.b.propman.so", "127.0.0.1:3000",
      "hodan.example.com", "evilpropman.so", null]) {
      expect(classifyHost(host, host?.includes("localhost") ? "localhost" : "propman.so")).toEqual({ kind: "root" });
    }
  });

  it("ignores subdomains that can never be a tenant slug", () => {
    expect(classifyHost("ab.localhost", "localhost")).toEqual({ kind: "root" });
    expect(classifyHost("-abc.localhost", "localhost")).toEqual({ kind: "root" });
  });
});
