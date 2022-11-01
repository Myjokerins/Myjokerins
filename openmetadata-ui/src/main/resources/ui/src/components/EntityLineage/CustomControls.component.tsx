/*
 *  Copyright 2021 Collate
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import { Button } from 'antd';
import classNames from 'classnames';
import { LoadingState } from 'Models';
import React, {
  ButtonHTMLAttributes,
  FC,
  HTMLAttributes,
  memo,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { FitViewOptions, useReactFlow } from 'reactflow';
import { NO_PERMISSION_FOR_ACTION } from '../../constants/HelperTextUtil';
import { getLoadingStatusValue } from '../../utils/EntityLineageUtils';
import SVGIcons, { Icons } from '../../utils/SvgUtils';

export interface ControlProps extends HTMLAttributes<HTMLDivElement> {
  showZoom?: boolean;
  showFitView?: boolean;
  fitViewParams?: FitViewOptions;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitView?: () => void;
  handleFullScreenViewClick?: () => void;
  deleted: boolean | undefined;
  isEditMode: boolean;
  hasEditAccess: boolean | undefined;
  isColumnsExpanded: boolean;
  onEditLinageClick: () => void;
  onExpandColumnClick: () => void;
  loading: boolean;
  status: LoadingState;
}

export const ControlButton: FC<ButtonHTMLAttributes<HTMLButtonElement>> = ({
  children,
  className,
  ...rest
}) => (
  <button
    className={classNames('control-button', className)}
    draggable={false}
    type="button"
    {...rest}>
    {children}
  </button>
);

const CustomControls: FC<ControlProps> = ({
  style,
  isColumnsExpanded,
  showFitView = true,
  showZoom = true,
  fitViewParams,
  className,
  deleted,
  isEditMode,
  hasEditAccess,
  onEditLinageClick,
  onExpandColumnClick,
  handleFullScreenViewClick,
  loading,
  status,
}: ControlProps) => {
  const { fitView, zoomIn, zoomOut, zoomTo } = useReactFlow();
  const [zoom, setZoom] = useState<number>(1.5);

  const onZoomInHandler = useCallback(() => {
    setZoom((pre) => (pre < 2.5 ? pre + 0.25 : pre));
    zoomIn?.();
  }, [zoomIn]);

  const onZoomOutHandler = useCallback(() => {
    setZoom((pre) => (pre > 0.5 ? pre - 0.25 : pre));
    zoomOut?.();
  }, [zoomOut]);

  const onFitViewHandler = useCallback(() => {
    fitView?.(fitViewParams);
  }, [fitView, fitViewParams]);

  const onZoomHandler = useCallback(
    (zoomLevel: number) => {
      zoomTo?.(zoomLevel);
    },
    [zoomTo]
  );

  const editIcon = useMemo(() => {
    return (
      <SVGIcons
        alt="icon-edit-lineag"
        className="m--t-xss"
        icon={isEditMode ? 'icon-edit-lineage' : 'icon-edit-lineage-color'}
        width="14"
      />
    );
  }, [isEditMode]);

  return (
    <div
      className={classNames(
        'controls-container tw-flex tw-gap-4 tw-z-10',
        className
      )}
      style={style}>
      <Button
        ghost
        data-testid="expand-column"
        type="primary"
        onClick={onExpandColumnClick}>
        {isColumnsExpanded ? 'Collapse All' : 'Expand All'}
      </Button>

      {showZoom && (
        <div className="flow-control tw-flex tw-gap-x-2 tw-bg-body-hover tw-border border-gray tw-h-8 tw-shadow-md tw-rounded">
          <ControlButton
            className="tw-px-1 tw-cursor-pointer tw-w-8 tw-h-8"
            onClick={onZoomOutHandler}>
            <SVGIcons
              alt="minus-icon"
              className="tw--mt-0.5"
              icon="icon-control-minus"
              width="12"
            />
          </ControlButton>
          <input
            className="tw-mt-0.5 tw-bg-body-hover"
            max={2.5}
            min={0.5}
            step={0.1}
            type="range"
            value={zoom}
            onChange={(e) => {
              const zoomValue = parseFloat(e.target.value);
              onZoomHandler(zoomValue);
              setZoom(zoomValue);
            }}
          />
          <ControlButton
            className="tw-px-1 tw-cursor-pointer tw-w-8 tw-h-8"
            onClick={onZoomInHandler}>
            <SVGIcons
              alt="plus-icon"
              className="tw--mt-0.5"
              icon="icon-control-plus"
              width="12"
            />
          </ControlButton>
        </div>
      )}
      {showFitView && (
        <ControlButton
          className="tw-border border-gray tw-rounded tw-px-1 tw-bg-body-main tw-shadow-md tw-cursor-pointer tw-w-8 tw-h-8"
          onClick={onFitViewHandler}>
          <SVGIcons alt="fit-view" icon={Icons.FITVEW} width="16" />
        </ControlButton>
      )}
      {handleFullScreenViewClick && (
        <ControlButton
          className="tw-border border-gray tw-rounded tw-px-1 tw-bg-body-main tw-shadow-md tw-cursor-pointer tw-w-8 tw-h-8"
          onClick={handleFullScreenViewClick}>
          <SVGIcons
            alt="fullScreenViewicon"
            icon={Icons.FULL_SCREEN}
            width="16"
          />
        </ControlButton>
      )}
      {!deleted && (
        <ControlButton
          className={classNames('h-8 w-8 rounded-full p-x-xss tw-shadow-lg', {
            'bg-primary': isEditMode,
            'bg-primary-hover-lite': !isEditMode,
          })}
          data-testid="edit-lineage"
          disabled={!hasEditAccess}
          title={hasEditAccess ? 'Edit Lineage' : NO_PERMISSION_FOR_ACTION}
          onClick={onEditLinageClick}>
          {getLoadingStatusValue(editIcon, loading, status)}
        </ControlButton>
      )}
    </div>
  );
};

export default memo(CustomControls);
