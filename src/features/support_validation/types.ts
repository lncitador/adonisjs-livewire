/**
 * Opaque type for validated properties
 * Similar to Lucid's HasMany, HasOne, etc.
 *
 * This type is used to mark properties that have validation rules
 * and allows TypeScript to infer the validated type.
 *
 * @example
 * ```typescript
 * class MyComponent extends Component {
 *   @validator(() => vine.string().minLength(3))
 *   declare name: HasValidate<string>
 * }
 * ```
 */
export type HasValidate<T> = T & {
  readonly __opaque_type: 'hasValidate'
  readonly __validated_type: T
}

/**
 * Extract properties that have HasValidate type
 */
export type ExtractValidatedProperties<Component> = {
  [Key in keyof Component]: Component[Key] extends HasValidate<infer T> ? Key : never
}[keyof Component]

/**
 * Extract the validated type from a HasValidate property
 */
export type GetValidatedType<Property extends HasValidate<any>> =
  Property extends HasValidate<infer T> ? T : never

/**
 * Build a type object with validated properties and their types
 * This is used as the return type for validate() method
 */
export type ValidatedProperties<Component> = {
  [Key in ExtractValidatedProperties<Component>]: Component[Key] extends HasValidate<infer T>
    ? T
    : never
}
