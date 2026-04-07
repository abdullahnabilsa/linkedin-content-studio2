export type SystemConfig = {
  key: string;
  value: string;
  value_type: 'string' | 'integer' | 'boolean';
};

export type ConfigKey = keyof SystemConfig;
export type ConfigValueType = SystemConfig['value_type'];