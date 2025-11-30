import { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";
import type { AsymmetricMatchers as _AsymmetricMatchers, Matchers as _Matchers } from "bun:test";

declare module "bun:test" {
    interface Matchers<T>
        extends TestingLibraryMatchers<typeof expect.stringContaining, T>
    {}
    // @ts-expect-error
    interface AsymmetricMatchers extends TestingLibraryMatchers {}
}
