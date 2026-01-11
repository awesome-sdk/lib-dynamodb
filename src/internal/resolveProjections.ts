/**
 * Resolves legacy AttributesToGet (with supported nested path syntax)
 * into a native ProjectionExpression and ExpressionAttributeNames.
 *
 * @param attributesToGet Array of field paths to retrieve
 * @returns Object containing ProjectionExpression and ExpressionAttributeNames
 */
export function resolveProjections(attributesToGet: string[]): {
  ProjectionExpression: string
  ExpressionAttributeNames: Record<string, string>
} {
  const names: Record<string, string> = {}
  const projectionParts: string[] = []

  attributesToGet.forEach((path, pathIndex) => {
    // Improved parser:
    // Split by `.` NOT inside brackets to get path segments
    // Regex matches either array index [N] or dot-separated parts
    const parts = path.split('.').flatMap(part => {
      return part.split(/(\[[0-9]+\])/).filter(Boolean)
    })

    const connectionParts: string[] = []

    parts.forEach((part, partIndex) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        // It's an array index, append directly without placeholder
        connectionParts.push(part)
      } else {
        // It's an attribute name, use placeholder
        const placeholder = `#p${pathIndex}_${partIndex}`
        names[placeholder] = part
        connectionParts.push(placeholder)
      }
    })

    projectionParts.push(connectionParts.join('.'))
  })

  // Cleanup dot-notation for array indices: items.[0] -> items[0]
  const projectionExpression = projectionParts.map(p => p.replace(/\.\[/g, '[')).join(', ')

  return {
    ProjectionExpression: projectionExpression,
    ExpressionAttributeNames: names
  }
}
