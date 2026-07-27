export function toCamelCaseDeep<T = any>(obj: any): T {
  if (Array.isArray(obj)) {
    return obj.map((v) => toCamelCaseDeep(v)) as T;
  }

  if (obj instanceof Date) {
    return obj as T;
  }

  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc: any, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

      acc[camelKey] = toCamelCaseDeep(obj[key]);
      return acc;
    }, {}) as T;
  }

  return obj;
}

export function toCamelCase(name: string): string {
  return name.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
