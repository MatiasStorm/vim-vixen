import * as parsers from "../../src/shared/urls";
import { expect } from "chai";
import Search from "../../src/shared/settings/Search";

describe("shared/commands/parsers", () => {
  describe("#searchUrl", () => {
    const config = Search.fromJSON({
      default: "google",
      engines: {
        google: "https://google.com/search?q={}",
        yahoo: "https://yahoo.com/search?q={}",
      },
    });

    it("convertes search url", () => {
      expect(parsers.searchUrl("google.com", config)).to.equal(
        "http://google.com"
      );
      expect(parsers.searchUrl("google apple", config)).to.equal(
        "https://google.com/search?q=apple"
      );
      expect(parsers.searchUrl("yahoo apple", config)).to.equal(
        "https://yahoo.com/search?q=apple"
      );
      expect(parsers.searchUrl("google apple banana", config)).to.equal(
        "https://google.com/search?q=apple%20banana"
      );
      expect(parsers.searchUrl("yahoo C++CLI", config)).to.equal(
        "https://yahoo.com/search?q=C%2B%2BCLI"
      );
    });

    it("user default  search engine", () => {
      expect(parsers.searchUrl("apple banana", config)).to.equal(
        "https://google.com/search?q=apple%20banana"
      );
    });

    it("searches with a word containing a colon", () => {
      expect(parsers.searchUrl("foo:", config)).to.equal(
        "https://google.com/search?q=foo%3A"
      );
      expect(parsers.searchUrl("std::vector", config)).to.equal(
        "https://google.com/search?q=std%3A%3Avector"
      );
    });

    it("localhost urls", () => {
      expect(parsers.searchUrl("localhost", config)).to.equal(
        "http://localhost"
      );
      expect(parsers.searchUrl("http://localhost", config)).to.equal(
        "http://localhost/"
      );
      expect(parsers.searchUrl("localhost:8080", config)).to.equal(
        "http://localhost:8080"
      );
      expect(parsers.searchUrl("localhost:80nan", config)).to.equal(
        "https://google.com/search?q=localhost%3A80nan"
      );
      expect(parsers.searchUrl("localhost 8080", config)).to.equal(
        "https://google.com/search?q=localhost%208080"
      );
      expect(parsers.searchUrl("localhost:80/build", config)).to.equal(
        "http://localhost:80/build"
      );
    });
  });

  describe("#normalizeUrl", () => {
    it("normalize urls", () => {
      expect(parsers.normalizeUrl("https://google.com/")).to.equal(
        "https://google.com/"
      );
      expect(parsers.normalizeUrl("google.com")).to.equal("http://google.com");
    });
  });
});
