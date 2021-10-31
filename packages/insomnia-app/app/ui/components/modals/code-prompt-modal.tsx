import { autoBindMethodsForReact } from 'class-autobind-decorator';
import React, { PureComponent } from 'react';

import { AUTOBIND_CFG } from '../../../common/constants';
import { HandleGetRenderContext, HandleRender } from '../../../common/render';
import { CopyButton } from '../base/copy-button';
import { Dropdown } from '../base/dropdown/dropdown';
import { DropdownButton } from '../base/dropdown/dropdown-button';
import { DropdownDivider } from '../base/dropdown/dropdown-divider';
import { DropdownItem } from '../base/dropdown/dropdown-item';
import { Modal } from '../base/modal';
import { ModalBody } from '../base/modal-body';
import { ModalFooter } from '../base/modal-footer';
import { ModalHeader } from '../base/modal-header';
import { CodeEditor } from '../codemirror/code-editor';
import { MarkdownEditor } from '../markdown-editor';

const MODES = {
  'text/plain': 'Plain Text',
  'application/json': 'JSON',
  'application/xml': 'XML',
  'application/edn': 'EDN',
  'text/x-markdown': 'Markdown',
  'text/html': 'HTML',
};

interface Props {
  editorFontSize: number;
  editorIndentSize: number;
  editorKeyMap: string;
  editorLineWrapping: boolean;
  nunjucksPowerUserMode: boolean;
  isVariableUncovered: boolean;
  handleGetRenderContext?: HandleGetRenderContext;
  handleRender?: HandleRender;
}

interface State {
  title: string;
  defaultValue: string;
  submitName: string;
  placeholder: string;
  hint: string;
  mode: string;
  hideMode: boolean;
  enableRender: boolean;
  showCopyButton: boolean;
  enableEditFontSize: boolean;
  hideLineNumbers: boolean;
  editorFontSize: number;
}

@autoBindMethodsForReact(AUTOBIND_CFG)
export class CodePromptModal extends PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      title: 'Not Set',
      defaultValue: '',
      submitName: 'Not Set',
      placeholder: '',
      hint: '',
      mode: 'text/plain',
      hideMode: false,
      enableRender: false,
      showCopyButton: false,
      editorFontSize: props.editorFontSize,
      enableEditFontSize: false,
      hideLineNumbers: true,
    };
  }

  modal: Modal | null = null;
  _onModeChange: Function = () => { };
  _onChange: Function = () => { };

  _setModalRef(n: Modal) {
    this.modal = n;
  }

  _handleChange(value) {
    this._onChange(value);
  }

  _handleChangeMode(mode) {
    this.setState({ mode });
    this._onModeChange?.(mode);
  }

  hide() {
    this.modal?.hide();
  }

  show(options) {
    const {
      title,
      defaultValue,
      submitName,
      placeholder,
      hint,
      mode,
      hideMode,
      enableRender,
      onChange,
      onModeChange,
      showCopyButton,
      enableEditFontSize,
      hideLineNumbers,
    } = options;
    this._onChange = onChange;
    this._onModeChange = onModeChange;
    const realMode = typeof mode === 'string' ? mode : 'text/plain';
    this.setState({
      title,
      defaultValue,
      submitName,
      placeholder,
      hint,
      enableRender,
      hideMode,
      showCopyButton,
      mode: realMode || this.state.mode || 'text/plain',
      enableEditFontSize,
      hideLineNumbers: hideLineNumbers !== false,
    });

    this.modal?.show();
  }

  _handleChangeFontSize(e: React.SyntheticEvent<HTMLInputElement | HTMLSelectElement>) {
    this.setState({
      editorFontSize: parseInt(e.currentTarget.value),
    });
  }

  render() {
    const {
      handleGetRenderContext,
      nunjucksPowerUserMode,
      isVariableUncovered,
      handleRender,
      editorKeyMap,
      editorIndentSize,
      editorLineWrapping,
    } = this.props;
    const {
      submitName,
      title,
      placeholder,
      defaultValue,
      hint,
      mode,
      hideMode,
      enableRender,
      showCopyButton,
      editorFontSize,
      enableEditFontSize,
      hideLineNumbers,
    } = this.state;

    return (
      <Modal ref={this._setModalRef} freshState tall>
        <ModalHeader>{title}</ModalHeader>
        <ModalBody
          noScroll
          className="wide tall"
          style={
            showCopyButton
              ? {
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr)',
                gridTemplateRows: 'auto minmax(0, 1fr)',
              }
              : {
                minHeight: '10rem',
              }
          }
        >
          {showCopyButton ? (
            <div className="pad-top-sm pad-right-sm">
              <CopyButton content={defaultValue} className="pull-right" />
            </div>
          ) : null}
          {mode === 'text/x-markdown' ? (
            <div className="pad-sm tall">
              <MarkdownEditor
                tall
                defaultValue={defaultValue}
                placeholder={placeholder}
                onChange={this._handleChange}
                handleGetRenderContext={enableRender ? handleGetRenderContext : undefined}
                handleRender={enableRender ? handleRender : undefined}
                mode={mode}
                keyMap={editorKeyMap}
                indentSize={editorIndentSize}
                fontSize={editorFontSize}
                lineWrapping={editorLineWrapping}
                nunjucksPowerUserMode={nunjucksPowerUserMode}
                isVariableUncovered={isVariableUncovered}
              />
            </div>
          ) : (
            <div className="pad-sm pad-bottom tall" style={{ display: 'flex', flexDirection: 'column' }}>
              {
                enableEditFontSize ? (
                  <div className="form-control">
                    <label className="flex">
                      <span className="faded space-left space-right no-wrap" style={{ alignSelf: 'center' }}>Font size:</span>
                      <input
                        type="number"
                        min="5"
                        max="30"
                        defaultValue={editorFontSize || '0'}
                        onChange={this._handleChangeFontSize}
                      />
                    </label>
                  </div>
                ) : null
              }
              <div className="form-control form-control--outlined form-control--tall tall">
                <CodeEditor
                  key={editorFontSize}
                  hideLineNumbers={hideLineNumbers}
                  manualPrettify
                  className="tall"
                  defaultValue={defaultValue}
                  placeholder={placeholder}
                  onChange={this._handleChange}
                  nunjucksPowerUserMode={nunjucksPowerUserMode}
                  isVariableUncovered={isVariableUncovered}
                  getRenderContext={handleGetRenderContext}
                  render={handleRender}
                  mode={mode}
                  keyMap={editorKeyMap}
                  indentSize={editorIndentSize}
                  fontSize={editorFontSize}
                  lineWrapping={editorLineWrapping}
                />
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          {!hideMode ? (
            <Dropdown>
              <DropdownButton className="btn btn--clicky margin-left-sm">
                {MODES[mode]}
                <i className="fa fa-caret-down space-left" />
              </DropdownButton>
              <DropdownDivider>Editor Syntax</DropdownDivider>
              {Object.keys(MODES).map(mode => (
                <DropdownItem key={mode} value={mode} onClick={this._handleChangeMode}>
                  <i className="fa fa-code" />
                  {MODES[mode]}
                </DropdownItem>
              ))}
            </Dropdown>
          ) : null}
          <div className="margin-left faint italic txt-sm">{hint ? `* ${hint}` : ''}</div>
          <button className="btn" onClick={this.hide}>
            {submitName || 'Submit'}
          </button>
        </ModalFooter>
      </Modal>
    );
  }
}
