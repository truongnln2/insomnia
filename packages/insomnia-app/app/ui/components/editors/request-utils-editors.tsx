import { autoBindMethodsForReact } from 'class-autobind-decorator';
import React, { PureComponent } from 'react';

import {
  AUTOBIND_CFG,
  REQUEST_DATASET_EDITOR_TAB,
  REQUEST_SETTER_EDITOR_TAB,
  REQUEST_SETTING_TAB,
  RESPONSE_VISUALIZE_EDITOR_TAB,
} from '../../../common/constants';
import { HandleGetRenderContext, HandleRender } from '../../../common/render';
import { Request } from '../../../models/request';
import { RequestDataSet } from '../../../models/request-dataset';
import { Settings } from '../../../models/settings';
import { Workspace } from '../../../models/workspace';
import { WrapperProps } from '../wrapper';
import RequestDatasetEditor from './request-dataset-editor';
import { RequestEventSetterEditors } from './request-event-setter-editor';
import { RequestSettingsEditor } from './request-settings-editor';
import { ResponseVisualizeEditor } from './response-visualize-editor';

interface Props {
  models: any | null;
  handleGetRenderContext: HandleGetRenderContext;
  handleRender: HandleRender;
  nunjucksPowerUserMode: boolean;
  isVariableUncovered: boolean;
  commonUpdateRequest: (patch: Partial<Request>) => Promise<Request | null>;
  workspace: Workspace;
  environmentId: string;

  activeTab: string;
  request: Request;
  settings: Settings;
  handleGenerateCode: Function;
  wrapperProps: WrapperProps;
  handleSendWithDataset: (r: Request, headers: RequestDataSet) => void;
}

@autoBindMethodsForReact(AUTOBIND_CFG)
export class RequestUtilsEditors extends PureComponent<Props> {
  render() {
    const {
      activeTab,
      handleSendWithDataset,
      handleGenerateCode,
      settings,
      wrapperProps,
      ...requestTabProps
    } = this.props;
    const {
      handleRender,
      handleGetRenderContext,
      isVariableUncovered,
      nunjucksPowerUserMode,
      request,
      workspace,
      environmentId,
    } = requestTabProps;
    const {
      activeRequestMeta,
      handleUpdateActiveRequestMeta,
      workspaces,
    } = wrapperProps;
    if (typeof activeTab === 'string') {
      switch (activeTab) {
        case REQUEST_SETTER_EDITOR_TAB:
          return (
            <RequestEventSetterEditors
              request={requestTabProps.request}
              handleGetRenderContext={handleGetRenderContext}
              handleRender={handleRender}
              isVariableUncovered={isVariableUncovered}
              nunjucksPowerUserMode={nunjucksPowerUserMode}
              wrapperProps={wrapperProps}
            />
          );
        case REQUEST_DATASET_EDITOR_TAB:
          return (
            <RequestDatasetEditor
              wrapperProps={wrapperProps}
              handleRender={handleRender}
              handleGenerateCode={handleGenerateCode}
              handleGetRenderContext={handleGetRenderContext}
              nunjucksPowerUserMode={settings.nunjucksPowerUserMode}
              isVariableUncovered={isVariableUncovered}
              request={request}
              workspace={workspace}
              environmentId={environmentId}
              onSendWithDataset={handleSendWithDataset}
            />
          );
        case RESPONSE_VISUALIZE_EDITOR_TAB:
          return (
            <ResponseVisualizeEditor
              handleRender={handleRender}
              handleGetRenderContext={handleGetRenderContext}
              isVariableUncovered={isVariableUncovered}
              request={request}
              requestMeta={activeRequestMeta}
              settings={settings}
              onChangeRequestMeta={handleUpdateActiveRequestMeta}
            />
          );
        case REQUEST_SETTING_TAB:
          return (
            <div className="pad">
              <RequestSettingsEditor
                request={request}
                workspace={workspace}
                forceEditMode={false}
                editorFontSize={settings.editorFontSize}
                editorIndentSize={settings.editorIndentSize}
                editorKeyMap={settings.editorKeyMap}
                editorLineWrapping={settings.editorLineWrapping}
                handleRender={handleRender}
                handleGetRenderContext={handleGetRenderContext}
                nunjucksPowerUserMode={nunjucksPowerUserMode}
                workspaces={workspaces}
                isVariableUncovered={isVariableUncovered}
              />
            </div>
          );
        default:
          return null;
      }
    }
    return null;
  }
}
