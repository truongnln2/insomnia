import { autoBindMethodsForReact } from 'class-autobind-decorator';
import { ToggleSwitch } from 'insomnia-components';
import React, { PureComponent } from 'react';
import styled from 'styled-components';

import { AUTOBIND_CFG } from '../../../common/constants';
import { HandleGetRenderContext, HandleRender } from '../../../common/render';
import { Request } from '../../../models/request';
import { RequestMeta } from '../../../models/request-meta';
import { Settings } from '../../../models/settings';
import { RawEditor } from './body/raw-editor';

interface Props {
  request: Request;
  requestMeta: RequestMeta | undefined;
  onChangeRequestMeta: (patch: Partial<RequestMeta>, requestId?: string) => void;
  settings: Settings;
  handleRender: HandleRender;
  handleGetRenderContext: HandleGetRenderContext;
  isVariableUncovered: boolean;
}

interface State {
  visualizeTemplate: string;
  metaId: string;
  nunjucksPowerUserMode: boolean;
  renderKey: number;
}

const Container = styled.div`
  height: 100%;
  .editor-header {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    > h4 {
      padding: var(--padding-md);
      text-align: left;
      width: 100%;
    }
    > label {
      width: 180px;
    }
  }
  .editor {
    .cm-nunjucks-tag {
      padding: 2px 5px;
      border-radius: 5px;
      font-weight: bold;
    }
    .cm-nunjucks-variable {
      padding: 2px 5px;
      border-radius: 5px;
    }
    .cm-nunjucks-comment {
      color: #008000;
      padding: 2px 5px;
      border-radius: 5px;
      font-style: italic;
    }
  }
`;

@autoBindMethodsForReact(AUTOBIND_CFG)
export class ResponseVisualizeEditor extends PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      visualizeTemplate: props.requestMeta?.visualizeTemplate || '',
      metaId: props.requestMeta?._id || '',
      nunjucksPowerUserMode: props.requestMeta?.visualizePowerUserMode || false,
      renderKey: 0,
    };
  }

  private _triggerTimeout: NodeJS.Timeout | null = null;

  static getDerivedStateFromProps(nextProps, prevState) {
    const { requestMeta } = nextProps;
    if (!requestMeta) {
      return {
        ...prevState,
        metaId: '',
        visualizeTemplate: '',
        nunjucksPowerUserMode: false,
      };
    }
    if (requestMeta._id !== prevState.metaId) {
      return {
        ...prevState,
        metaId: requestMeta._id,
        visualizeTemplate: nextProps.requestMeta.visualizeTemplate || '',
        nunjucksPowerUserMode: nextProps.requestMeta.visualizePowerUserMode || false,
      };
    }
    return prevState;
  }

  _handleRawChange(rawValue: string) {
    const { onChangeRequestMeta, request } = this.props;
    const { metaId } = this.state;
    if (metaId) {
      if (this._triggerTimeout !== null) {
        clearTimeout(this._triggerTimeout);
      }
      this.setState({
        visualizeTemplate: rawValue,
      }, () => {
        this._triggerTimeout = setTimeout(() => {
          this._triggerTimeout = null;
          onChangeRequestMeta({
            visualizeTemplate: rawValue,
          }, request._id);
        }, 3000);
      });
    }
  }

  componentWillUnmount() {
    if (this._triggerTimeout !== null) {
      const { onChangeRequestMeta, request } = this.props;
      const { visualizeTemplate } = this.state;
      clearTimeout(this._triggerTimeout);
      onChangeRequestMeta({
        visualizeTemplate,
      }, request._id);
    }
  }

  _updateNunjucksPowerUserMode() {
    const { nunjucksPowerUserMode, renderKey } = this.state;
    const { onChangeRequestMeta, request } = this.props;

    onChangeRequestMeta({
      visualizePowerUserMode: !nunjucksPowerUserMode,
    }, request._id);

    this.setState({
      nunjucksPowerUserMode: !nunjucksPowerUserMode,
      renderKey: renderKey + 1,
    });
  }

  render() {
    const {
      request,
      settings,
      handleRender,
      handleGetRenderContext,
      isVariableUncovered,
    } = this.props;
    const { visualizeTemplate, nunjucksPowerUserMode, renderKey } = this.state;
    const uniqueKey = `${request._id}::response-visualizer-setting`;
    return (
      <Container>
        <div className="editor-header">
          <h4>Response visualize editor</h4>
          <ToggleSwitch
            labelClassName="space-right"
            checked={nunjucksPowerUserMode}
            label={'Show raw tag'}
            onChange={this._updateNunjucksPowerUserMode}
          />
        </div>
        <RawEditor
          key={renderKey}
          uniquenessKey={uniqueKey}
          fontSize={settings.editorFontSize}
          indentSize={settings.editorIndentSize}
          keyMap={settings.editorKeyMap}
          lineWrapping={settings.editorLineWrapping}
          indentWithTabs={settings.editorIndentWithTabs}
          contentType={'xml'}
          content={visualizeTemplate || ''}
          render={handleRender}
          getRenderContext={handleGetRenderContext}
          nunjucksPowerUserMode={nunjucksPowerUserMode}
          isVariableUncovered={isVariableUncovered}
          onChange={this._handleRawChange}
        />
      </Container>
    );
  }
}
