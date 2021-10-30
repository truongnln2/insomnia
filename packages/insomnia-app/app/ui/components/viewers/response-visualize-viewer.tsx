import { autoBindMethodsForReact } from 'class-autobind-decorator';
import React, { PureComponent } from 'react';

import { AUTOBIND_CFG } from '../../../common/constants';
import { RequestMeta } from '../../../models/request-meta';

interface Props {
  requestMeta: RequestMeta | undefined;
  handleRender: (template: any) => Promise<string>;
}

interface State {
  body: string;
  visualizeTemplate: string;
  renderKey: number;
}

@autoBindMethodsForReact(AUTOBIND_CFG)
export class ResponseVisualizeViewer extends PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { body: 'about:blank', visualizeTemplate: '', renderKey: 1 };
    this._load();
  }

  _webview: HTMLElement | null = null;
  _updateTimeout: any = null;

  static encodeBody(body: string) {
    body = `
  <!DOCTYPE html>
  <html>
    <head>
      <title>Response visualizer</title>
      <meta charset="UTF-8">
    </head>
    <body>
      ${body}
    </body>
  </html>`;
    body = 'data:text/html;charset=UTF-8,' + encodeURIComponent(body);
    return body;
  }

  async _load() {
    const { handleRender, requestMeta } = this.props;
    const { renderKey, visualizeTemplate } = this.state;
    if (!requestMeta) {
      this.setState({ body: 'about:blank', visualizeTemplate: '', renderKey: renderKey + 1 });
    } else if (visualizeTemplate !== requestMeta.visualizeTemplate) {
      let body;
      try {
        body = await handleRender(requestMeta.visualizeTemplate || '');
      } catch (err) {
        body = `<h4 style="color:red;">${err.message}</h4>`;
      }
      body = ResponseVisualizeViewer.encodeBody(body);
      this.setState({
        body,
        visualizeTemplate: requestMeta.visualizeTemplate || '',
        renderKey: renderKey + 1,
      });
    }
  }

  componentDidUpdate() {
    this._load();
  }

  render() {
    const { body, renderKey } = this.state;
    return (
      <webview src={body} key={renderKey} webpreferences={'javascript=no'} />
    );
  }
}
