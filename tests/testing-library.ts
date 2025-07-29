import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach, expect } from "bun:test";

// @ts-expect-error
expect.extend(matchers);

afterEach(() => {
    cleanup();
});
