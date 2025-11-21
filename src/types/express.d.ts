declare global {
  namespace Express {
    interface Locals {
      uuid?: string;
    }

    interface Response {
      locals: Locals;
    }
  }
}
