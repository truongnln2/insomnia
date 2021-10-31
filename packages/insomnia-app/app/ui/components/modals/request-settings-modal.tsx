import { autoBindMethodsForReact } from 'class-autobind-decorator';
import React, { PureComponent } from 'react';

import { AUTOBIND_CFG } from '../../../common/constants';
import { database as db } from '../../../common/database';
import { HandleGetRenderContext, HandleRender } from '../../../common/render';
import { GrpcRequest } from '../../../models/grpc-request';
import type { Request } from '../../../models/request';
import { isWorkspace, Workspace } from '../../../models/workspace';
import { Modal } from '../base/modal';
import { ModalBody } from '../base/modal-body';
import { ModalHeader } from '../base/modal-header';
import { RequestSettingsEditor } from '../editors/request-settings-editor';

interface Props {
  editorFontSize: number;
  editorIndentSize: number;
  editorKeyMap: string;
  editorLineWrapping: boolean;
  nunjucksPowerUserMode: boolean;
  isVariableUncovered: boolean;
  handleRender: HandleRender;
  handleGetRenderContext: HandleGetRenderContext;
  workspaces: Workspace[];
}

interface State {
  request: Request | GrpcRequest | null;
  forceEditMode: boolean;
  workspace?: Workspace;
}

interface RequestSettingsModalOptions {
  request: Request | GrpcRequest;
  forceEditMode: boolean;
}

@autoBindMethodsForReact(AUTOBIND_CFG)
export class RequestSettingsModal extends PureComponent<Props, State> {
  modal: Modal | null = null;

  state: State = {
    request: null,
    forceEditMode: false,
    workspace: undefined,
  };

  _setModalRef(n: Modal) {
    this.modal = n;
  }

  async show({ request, forceEditMode }: RequestSettingsModalOptions) {
    const { workspaces } = this.props;
    // Find workspaces for use with moving workspace
    const ancestors = await db.withAncestors(request);
    const doc = ancestors.find(isWorkspace);
    const workspaceId = doc ? doc._id : 'should-never-happen';
    const workspace = workspaces.find(w => w._id === workspaceId);
    this.setState(
      {
        request,
        forceEditMode,
        workspace: workspace,
      },
      () => {
        this.modal?.show();
      },
    );
  }

  hide() {
    this.modal?.hide();
  }

  render() {
    const {
      editorFontSize,
      editorIndentSize,
      editorKeyMap,
      editorLineWrapping,
      handleRender,
      handleGetRenderContext,
      nunjucksPowerUserMode,
      workspaces,
      isVariableUncovered,
    } = this.props;
    const { request, workspace, forceEditMode } = this.state;
    return (
      <Modal ref={this._setModalRef} freshState>
        <ModalHeader>
          Request Settings{' '}
          <span className="txt-sm selectable faint monospace">{request ? request._id : ''}</span>
        </ModalHeader>
        <ModalBody className="pad">
          <RequestSettingsEditor
            request={request}
            workspace={workspace}
            forceEditMode={forceEditMode}
            editorFontSize={editorFontSize}
            editorIndentSize={editorIndentSize}
            editorKeyMap={editorKeyMap}
            editorLineWrapping={editorLineWrapping}
            handleRender={handleRender}
            handleGetRenderContext={handleGetRenderContext}
            nunjucksPowerUserMode={nunjucksPowerUserMode}
            workspaces={workspaces}
            isVariableUncovered={isVariableUncovered}
          />
        </ModalBody>
      </Modal>
    );
  }
}
