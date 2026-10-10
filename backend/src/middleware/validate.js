/** Parses `req.body` with a zod schema and replaces it with the parsed value. */
export const validate = (schema) => (req, _res, next) => {
  req.body = schema.parse(req.body ?? {});
  next();
};
