import { autoBindMethodsForReact } from 'class-autobind-decorator';
import classnames from 'classnames';
import {
  Button,
  ListGroupItem,
  SvgIcon,
} from 'insomnia-components';
import React, { PureComponent } from 'react';
import styled from 'styled-components';

import { AUTOBIND_CFG, DATASET_WIDTH_TYPE_FIX_LEFT, DATASET_WIDTH_TYPE_PERCENTAGE } from '../../../common/constants';
import { HandleGetRenderContext, HandleRender } from '../../../common/render';
import { metaSortKeySort } from '../../../common/sorting';
import { RequestDataSet } from '../../../models/request-dataset';
import { Editable } from '../base/editable';
import { PromptButton } from '../base/prompt-button';
import KeyValueEditor from '../key-value-editor/editor';
import { WrapperProps } from '../wrapper';

interface Props {
  handleGetRenderContext: HandleGetRenderContext;
  wrapperProps: WrapperProps;
  handleRender: HandleRender;
  nunjucksPowerUserMode: boolean;
  isVariableUncovered: boolean;
  dataset: RequestDataSet;
  isBaseDataset: boolean;
  onChanged: (dataset: RequestDataSet) => void;
  onDeleteDataset?: (dataset: RequestDataSet) => void;
  onSendWithDataset?: (dataset: RequestDataSet) => void;
  onGenerateCodeWithDataset?: (dataset: RequestDataSet) => void;
}

interface State {
  isToggled: boolean;
  toggleIconRotation: number;
  datasetName: string;
  datasetKey: number;
  baseDataset: {
    id: string;
    metaSortKey: number;
    name: string;
    value: string;
    description: string;
  }[];
}

const StyledResultListItem = styled(ListGroupItem)`
  padding: 0 var(--padding-sm);

  > div:first-of-type {
    display: grid;
    grid-template-columns: auto auto minmax(0, 1fr) auto auto auto;
    padding: var(--padding-xs) 0;
  }

  svg {
    fill: var(--hl-xl);
  }

  h2 {
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-normal);
    margin: 0px;
    padding-top: 5px;
  }

  button {
    padding: 0px var(--padding-xs);
  }
`;

const StyledKeyPairSpliterContainer = styled.div`
  position: relative;
  > .spliter {
    position: absolute;
    top: 15px;
    bottom: calc(var(--padding-md) + var(--padding-sm) + var(--padding-sm) + var(--line-height-xs));
    border-left: 2px solid var(--hl-md);
    overflow: visible;
    cursor: ew-resize;
    z-index: 9;
    width: var(--drag-width);
    
    > i {
      position: absolute;
      top: -23px;
      left: -12.5px;
      color: var(--hl-md);
      cursor: pointer;
      padding: var(--padding-xs);
    }
  }
  .width-evaluater {
    position: absolute;
    height: 0;
    width: calc(100% - var(--line-height-sm) - 1.1rem - (var(--padding-xs) * 2) - var(--padding-sm));
    left: var(--line-height-sm);
  }
`;

@autoBindMethodsForReact(AUTOBIND_CFG)
class DatasetRowEditor extends PureComponent<Props, State> {
  editor: any;
  spliterElement: HTMLDivElement;

  constructor(props: Props) {
    super(props);
    const { dataset } = this.props;
    const datasetList = Object.keys(dataset.environment).map(k => ({
      _id: k,
      id: k,
      name: dataset.environment[k].name,
      metaSortKey: dataset.environment[k].metaSortKey,
      value: dataset.environment[k].value,
      description: dataset.environment[k].description,
    })).sort(metaSortKeySort);
    this.state = {
      isToggled: false,
      toggleIconRotation: -90,
      baseDataset: datasetList,
      datasetName: dataset.name,
      datasetKey: 0,
    };
  }

  static _getCommonNames() {
    return [];
  }

  static _getCommonValues() {
    return [];
  }

  _handleKeyValueUpdate(datasetList: any[]) {
    const { dataset, onChanged } = this.props;
    dataset.environment = datasetList.reduce((obj, ds, i) => {
      ds.metaSortKey = i;
      obj[ds.id] = {
        name: ds.name,
        description: ds.description,
        value: ds.value,
        metaSortKey: ds.metaSortKey,
      };
      return obj;
    }, {});
    onChanged(dataset);
    this.setState({
      baseDataset: datasetList,
    });
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    const { dataset, isBaseDataset } = nextProps;
    if (!isBaseDataset && (dataset as any).new) {
      const datasetList = Object.keys(dataset.environment).map(k => ({
        _id: k,
        id: k,
        name: dataset.environment[k].name,
        metaSortKey: dataset.environment[k].metaSortKey,
        value: dataset.environment[k].value,
        description: dataset.environment[k].description,
      })).sort(metaSortKeySort);
      return {
        ...prevState,
        baseDataset: datasetList,
        datasetName: dataset.name,
        datasetKey: prevState.datasetKey + 1,
      };
    }
    return prevState;
  }

  toggle() {
    this.setState({
      isToggled: !this.state.isToggled,
    });
  }

  _handleOnDeleteDataset() {
    if (this.props.onDeleteDataset) {
      this.props.onDeleteDataset(this.props.dataset);
    }
  }

  _prepareDataset(): RequestDataSet {
    const { dataset } = this.props;
    const { baseDataset, datasetName } = this.state;
    return Object.assign({}, dataset, {
      name: datasetName,
      environment: baseDataset.reduce((obj, ds, i) => {
        ds.metaSortKey = i;
        obj[ds.id] = {
          name: ds.name,
          description: ds.description,
          value: ds.value,
          metaSortKey: ds.metaSortKey,
        };
        return obj;
      }, {}),
    });
  }

  _handleOnSendWithDataset() {
    const { onSendWithDataset } = this.props;
    const thisDataset = this._prepareDataset();
    if (onSendWithDataset) {
      onSendWithDataset(thisDataset);
    }
  }

  _handleOnGenerateCode() {
    const { onGenerateCodeWithDataset } = this.props;
    const thisDataset = this._prepareDataset();
    if (onGenerateCodeWithDataset) {
      onGenerateCodeWithDataset(thisDataset);
    }
  }

  changeDatasetName(newName: string) {
    const { dataset, onChanged } = this.props;
    dataset.name = newName;
    onChanged(dataset);
    this.setState({
      datasetName: newName,
    });
  }

  render() {
    const {
      handleGetRenderContext,
      handleRender,
      isVariableUncovered,
      nunjucksPowerUserMode,
      isBaseDataset,
    } = this.props;
    const {
      isToggled,
      toggleIconRotation,
      datasetName,
      baseDataset,
      datasetKey,
    } = this.state;
    const {
      datasetPaneWidth,
      datasetPaneWidthType,
      handleToggleDatasetResizeType,
      handleSetRequestDatasetPaneRef,
      handleStartDragDatasetPaneHorizontal,
      handleResetDragDatasetPaneHorizontal,
    } = this.props.wrapperProps;
    const isPercentageType = datasetPaneWidthType === DATASET_WIDTH_TYPE_PERCENTAGE;
    const isFixedType = datasetPaneWidthType === DATASET_WIDTH_TYPE_FIX_LEFT;
    const spliterStyle: React.CSSProperties = {};
    let keyWidthStyle: React.CSSProperties;
    if (isPercentageType) {
      spliterStyle.left = `calc((100% - var(--line-height-sm) - 3.4rem - (var(--padding-xs) * 2) - var(--padding-sm)) * ${datasetPaneWidth} + var(--line-height-sm))`;
      keyWidthStyle = {
        width: (datasetPaneWidth / (1 - datasetPaneWidth) * 100) + '%',
      };
    } else {
      spliterStyle.left = `calc(${datasetPaneWidth}px + var(--line-height-sm))`;
      keyWidthStyle = {
        flexBasis: datasetPaneWidth + 'px',
        flexGrow: 0,
        flexShrink: 0,
      };
    }
    if (isBaseDataset) {
      if (this.props.wrapperProps) {
        return (
          <StyledKeyPairSpliterContainer>
            <div className="width-evaluater" ref={handleSetRequestDatasetPaneRef} />
            <div
              className="spliter"
              onMouseDown={handleStartDragDatasetPaneHorizontal}
              onDoubleClick={handleResetDragDatasetPaneHorizontal}
              style={spliterStyle}
            >
              <i
                className={classnames('fa', { 'fa-arrows-h': isPercentageType }, { 'fa-arrow-right': isFixedType })}
                // @ts-expect-error -- TSCONVERSION
                onClick={handleToggleDatasetResizeType}
              />
            </div>
            <KeyValueEditor
              keyWidth={keyWidthStyle}
              sortable={true}
              disableDelete={false}
              disableToggle={true}
              maxPairs={isBaseDataset ? undefined : baseDataset.length}
              namePlaceholder="data key"
              valuePlaceholder="data value"
              descriptionPlaceholder="description"
              pairs={baseDataset}
              nunjucksPowerUserMode={nunjucksPowerUserMode}
              isVariableUncovered={isVariableUncovered}
              handleRender={handleRender}
              handleGetRenderContext={handleGetRenderContext}
              handleGetAutocompleteNameConstants={DatasetRowEditor._getCommonNames}
              handleGetAutocompleteValueConstants={DatasetRowEditor._getCommonValues}
              onChange={this._handleKeyValueUpdate}
              disableDescription={true}
            />
          </StyledKeyPairSpliterContainer>
        );
      }
      return null;
    }
    return (
      <StyledResultListItem >
        <div>
          <Button
            onClick={this.toggle}
            variant="text"
            style={isToggled ? {} : { transform: `rotate(${toggleIconRotation}deg)` }}
          >
            <SvgIcon icon="chevron-down" />
          </Button>
          <Button variant="text" disabled>
            <SvgIcon icon="file" />
          </Button>
          <h2>
            <Editable
              className="block"
              onSubmit={this.changeDatasetName}
              value={datasetName}
            />
          </h2>
          <Button
            variant="text"
            onClick={this._handleOnGenerateCode}
          >
            <i className="fa fa-code" />
          </Button>
          <PromptButton
            key={Math.random()}
            tabIndex={-1}
            confirmMessage="Click to confirm"
            addIcon
            onClick={this._handleOnDeleteDataset}
            title="Delete dataset"
          >
            <i className="fa fa-trash-o" />
          </PromptButton>

          <Button
            variant="text"
            onClick={this._handleOnSendWithDataset}
          >
            <SvgIcon icon="play" />
          </Button>
        </div>
        {isToggled && <div>
          {baseDataset.length && <KeyValueEditor
            key={datasetKey}
            sortable={false}
            keyWidth={keyWidthStyle}
            disableDelete={true}
            disableToggle={true}
            maxPairs={isBaseDataset ? undefined : baseDataset.length}
            namePlaceholder="data key"
            valuePlaceholder="data value"
            descriptionPlaceholder="description"
            pairs={baseDataset}
            nunjucksPowerUserMode={nunjucksPowerUserMode}
            isVariableUncovered={isVariableUncovered}
            handleRender={handleRender}
            readOnlyKey
            ignoreSuggestKey
            handleGetRenderContext={handleGetRenderContext}
            handleGetAutocompleteNameConstants={DatasetRowEditor._getCommonNames}
            handleGetAutocompleteValueConstants={DatasetRowEditor._getCommonValues}
            onChange={this._handleKeyValueUpdate}
          />}
          {!baseDataset.length && <span>Update base dataset first</span>}
        </div>}
      </StyledResultListItem>
    );
  }
}

export default DatasetRowEditor;
