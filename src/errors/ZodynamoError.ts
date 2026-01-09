/**
 * Base error class for all Zodynamo related errors.
 * All custom errors in the library should extend this class.
 */
export abstract class ZodynamoError extends Error {
  constructor(message: string) {
    super(message)
    this.name = new.target.name
    // Set the prototype explicitly to ensure instanceof works correctly
    // when targeting older environments or when transpiled.
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
