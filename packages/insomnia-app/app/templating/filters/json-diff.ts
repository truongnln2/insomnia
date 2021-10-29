import { JsonDiffer } from 'json-difference';
const jsondifference = new JsonDiffer();
export default {
  name: 'jsonDiff',
  displayName: 'JSON difference',
  args: [
    {
      displayName: 'Compare to json',
      type: 'string',
      placeholder: 'Compare to json',
      defaultValue: '',
    },
  ],
  description: '',
  run: function(_ctx: any, firstJson: string | object, secondJson: string | object) {
    let body1 = {};
    let body2 = {};
    if (typeof firstJson === 'string') {
      body1 = JSON.parse(firstJson);
    } else {
      body1 = firstJson;
    }
    if (typeof secondJson === 'string') {
      body2 = JSON.parse(secondJson);
    } else {
      body2 = secondJson;
    }
    return jsondifference.getDiff(body1, body2);
  },
};
