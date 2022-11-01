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

import { findAllByTestId, findByTestId, render } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import {
  INITIAL_SORT_FIELD,
  INITIAL_SORT_ORDER,
} from '../../constants/explore.constants';
import { SearchIndex } from '../../enums/search.enum';
import { mockResponse } from './exlore.mock';
import Explore from './Explore.component';

jest.mock('react-router-dom', () => ({
  useHistory: jest.fn(),
  useLocation: jest
    .fn()
    .mockImplementation(() => ({ search: '', pathname: '/explore' })),
  useParams: jest.fn().mockReturnValue({
    tab: 'tab',
  }),
}));

jest.mock('../../authentication/auth-provider/AuthProvider', () => {
  return {
    useAuthContext: jest.fn(() => ({
      isAuthDisabled: false,
      isAuthenticated: true,
      isProtectedRoute: jest.fn().mockReturnValue(true),
      isTourRoute: jest.fn().mockReturnValue(false),
      onLogoutHandler: jest.fn(),
    })),
  };
});

jest.mock('../../utils/FilterUtils', () => ({
  getFilterString: jest.fn().mockImplementation(() => 'user.address'),
  getFilterCount: jest.fn().mockImplementation(() => 10),
}));

jest.mock('../../components/searched-data/SearchedData', () => {
  return jest
    .fn()
    .mockImplementation(({ children }: { children: React.ReactNode }) => (
      <div data-testid="search-data">
        <div data-testid="wrapped-content">{children}</div>
      </div>
    ));
});

jest.mock(
  '../containers/PageLayout',
  () =>
    ({
      children,
      leftPanel,
      rightPanel,
    }: {
      children: React.ReactNode;
      rightPanel: React.ReactNode;
      leftPanel: React.ReactNode;
    }) =>
      (
        <div data-testid="PageLayout">
          <div data-testid="left-panel-content">{leftPanel}</div>
          <div data-testid="right-panel-content">{rightPanel}</div>
          {children}
        </div>
      )
);

const mockFunction = jest.fn();

describe('Test Explore component', () => {
  it('Component should render', async () => {
    const { container } = render(
      <Explore
        showDeleted
        searchIndex={SearchIndex.TABLE}
        searchResults={mockResponse}
        sortOrder={INITIAL_SORT_ORDER}
        sortValue={INITIAL_SORT_FIELD}
        tabCounts={{
          [SearchIndex.TABLE]: 15,
          [SearchIndex.TOPIC]: 2,
          [SearchIndex.DASHBOARD]: 8,
          [SearchIndex.PIPELINE]: 5,
          [SearchIndex.MLMODEL]: 2,
        }}
        onChangeAdvancedSearchJsonTree={mockFunction}
        onChangeAdvancedSearchQueryFilter={mockFunction}
        onChangePostFilter={mockFunction}
        onChangeSearchIndex={mockFunction}
        onChangeShowDeleted={mockFunction}
        onChangeSortOder={mockFunction}
        onChangeSortValue={mockFunction}
      />,
      {
        wrapper: MemoryRouter,
      }
    );
    const pageContainer = await findByTestId(container, 'PageLayout');
    const searchData = await findByTestId(container, 'search-data');
    const wrappedContent = await findByTestId(container, 'wrapped-content');
    const tabs = await findAllByTestId(container, /tab/i);

    expect(pageContainer).toBeInTheDocument();
    expect(searchData).toBeInTheDocument();
    expect(wrappedContent).toBeInTheDocument();
    expect(tabs.length).toBe(5);
  });
});
