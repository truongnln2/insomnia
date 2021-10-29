import jmespath from 'jmespath';
export default {
  name: 'jmespath',
  displayName: 'JMESPath',
  args: [
    {
      displayName: 'Query path',
      type: 'string',
      placeholder: 'Query path',
      defaultValue: '',
    },
  ],
  description: '',
  run: function(_ctx: any, fromObject: string | object, path: string) {
    let body1 = {};
    if (typeof fromObject === 'string') {
      body1 = JSON.parse(fromObject);
    } else {
      body1 = fromObject;
    }
    return jmespath.search(body1, path);
  },
};
