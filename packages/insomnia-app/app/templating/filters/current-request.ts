
import { PluginTemplateFilter, PluginTemplateFilterContext } from '../extensions';

const currentRequestFilter: PluginTemplateFilter = {
  name: 'currentRequest',
  displayName: 'Get current request',
  args: [],
  description: '',
  run: function(_ctx: PluginTemplateFilterContext, value: any) {
    const request = _ctx.util.models.request.getById(_ctx.meta.requestId);
    return {
      ...request,
      __previousValue: value,
    };
  },
};

export default currentRequestFilter;
