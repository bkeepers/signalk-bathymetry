export type Config = {
  anonymous?: boolean;
}

export const schema = {
  type: 'object',
  description: "By enabling this plugin, you agree to share your position and depth data with the IHO data collection service under the terms of Creative Commons 1.0 Universal public domain dedication (CCO).",
  properties: {
    anonymous: {
      type: 'boolean',
      default: false,
      title: 'Share data anonymously',
      description: 'If you don\'t want your vessel name and MMSI to be shared, then you can share the data anonymously.'
    }
  }
}
