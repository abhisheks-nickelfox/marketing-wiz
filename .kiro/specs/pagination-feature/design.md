# Pagination Feature - Design Document

## 1. Architecture Overview

The pagination feature will be implemented as a client-side solution using a reusable React component. Each list view will manage its own pagination state and integrate the Pagination component for navigation controls.

## 2. Component Design

### 2.1 Pagination Component

A reusable component that handles pagination UI and logic.

**Location**: `frontend/src/components/Pagination.jsx`

**Props**:
```typescript
interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  maxPageButtons?: number; // default: 5
}
```

**Features**:
- Previous/Next buttons
- Page number buttons with ellipsis for large ranges
- Current page highlighting
- Disabled states for boundary pages
- Responsive design
- Accessibility support (ARIA labels, keyboard navigation)

### 2.2 Pagination Hook

A custom hook to manage pagination state and logic.

**Location**: `frontend/src/hooks/usePagination.js`

**Interface**:
```javascript
function usePagination(items, itemsPerPage) {
  return {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
    nextPage,
    previousPage,
    startIndex,
    endIndex
  }
}
```

## 3. Implementation Details

### 3.1 FirmsList.jsx

**Changes**:
1. Add pagination state management
2. Filter firms based on search, then paginate
3. Integrate Pagination component
4. Update "Showing X of Y" counter

**Pagination Config**:
- Items per page: 10
- Show page numbers: 5 max

**State Management**:
```javascript
const [currentPage, setCurrentPage] = useState(1);
const itemsPerPage = 10;

// Apply search filter first
const filtered = firms.filter(f => 
  f.name.toLowerCase().includes(searchQuery.toLowerCase())
);

// Then paginate
const { paginatedItems, totalPages } = usePagination(filtered, itemsPerPage);
```

### 3.2 FirmDetail.jsx

**Changes**:
1. Add pagination for tickets list
2. Maintain ticket status filters with pagination
3. Add Pagination component below ticket cards

**Pagination Config**:
- Items per page: 10
- Show page numbers: 5 max

**State Management**:
```javascript
const [currentPage, setCurrentPage] = useState(1);
const itemsPerPage = 10;

// Paginate tickets
const { paginatedItems: paginatedTickets, totalPages } = 
  usePagination(tickets, itemsPerPage);
```

### 3.3 TicketList.jsx

**Changes**:
1. Add pagination state
2. Apply filters first, then paginate
3. Integrate Pagination component below table
4. Update footer to show range (e.g., "Showing 1-15 of 47 tickets")

**Pagination Config**:
- Items per page: 15
- Show page numbers: 7 max

**State Management**:
```javascript
const [currentPage, setCurrentPage] = useState(1);
const itemsPerPage = 15;

// Filters are applied via API, paginate results
const { paginatedItems, totalPages, startIndex, endIndex } = 
  usePagination(tickets, itemsPerPage);
```

### 3.4 TeamList.jsx

**Changes**:
1. Add pagination for team members table
2. Add pagination for selected member's tickets
3. Maintain search functionality with pagination

**Pagination Config**:
- Team members: 10 per page
- Member tickets: 5 per page (in detail view)

**State Management**:
```javascript
// Team list pagination
const [teamPage, setTeamPage] = useState(1);
const teamPerPage = 10;

// Member tickets pagination
const [ticketsPage, setTicketsPage] = useState(1);
const ticketsPerPage = 5;

// Apply search filter to team
const filtered = teamMembers.filter(m =>
  m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
  m.email.toLowerCase().includes(searchQuery.toLowerCase())
);

const { paginatedItems: paginatedTeam } = 
  usePagination(filtered, teamPerPage);

// Paginate selected member's tickets
const { paginatedItems: paginatedTickets } = 
  usePagination(selectedMember?.tickets || [], ticketsPerPage);
```

## 4. UI Design

### 4.1 Pagination Component Layout

```
[Previous] [1] [2] [3] ... [10] [Next]
```

**Styling**:
- Match existing design system colors and typography
- Use Material Symbols icons: `chevron_left`, `chevron_right`
- Current page: `bg-primary-container text-white`
- Other pages: `bg-surface-container-low text-on-surface hover:bg-surface-container`
- Disabled: `opacity-50 cursor-not-allowed`

### 4.2 Responsive Behavior

**Desktop (lg+)**:
- Show up to 7 page buttons
- Full Previous/Next text

**Tablet (md)**:
- Show up to 5 page buttons
- Full Previous/Next text

**Mobile (sm)**:
- Show up to 3 page buttons
- Icon-only Previous/Next buttons

## 5. State Management

### 5.1 URL State Persistence

Use URL query parameters to persist pagination state:

```javascript
// Read from URL
const searchParams = new URLSearchParams(location.search);
const initialPage = parseInt(searchParams.get('page') || '1', 10);

// Update URL on page change
const handlePageChange = (page) => {
  setCurrentPage(page);
  const params = new URLSearchParams(location.search);
  params.set('page', page.toString());
  navigate(`?${params.toString()}`, { replace: true });
};
```

### 5.2 Reset Pagination on Filter Change

When filters or search queries change, reset to page 1:

```javascript
useEffect(() => {
  setCurrentPage(1);
}, [searchQuery, filters]);
```

## 6. Accessibility

### 6.1 ARIA Labels

```jsx
<nav aria-label="Pagination navigation">
  <button aria-label="Go to previous page" disabled={currentPage === 1}>
    Previous
  </button>
  <button aria-label={`Go to page ${pageNum}`} aria-current={currentPage === pageNum ? 'page' : undefined}>
    {pageNum}
  </button>
  <button aria-label="Go to next page" disabled={currentPage === totalPages}>
    Next
  </button>
</nav>
```

### 6.2 Keyboard Navigation

- Tab through pagination controls
- Enter/Space to activate buttons
- Focus visible states

## 7. Performance Considerations

### 7.1 Client-Side Pagination

- Efficient for datasets under 1000 items
- No additional API calls required
- Instant page transitions

### 7.2 Future Server-Side Pagination

When datasets grow larger, backend APIs can be enhanced to support:
- `?page=1&limit=10` query parameters
- Response includes: `{ data: [], total: 100, page: 1, totalPages: 10 }`
- Frontend code remains largely unchanged

## 8. Error Handling

- If `currentPage` exceeds `totalPages`, reset to page 1
- Handle empty states gracefully
- Validate page numbers from URL parameters

## 9. Testing Strategy

### 9.1 Unit Tests
- Test usePagination hook with various data sizes
- Test Pagination component rendering
- Test page navigation logic

### 9.2 Integration Tests
- Test pagination with search/filter functionality
- Test URL state persistence
- Test responsive behavior

### 9.3 Manual Testing
- Test with 0, 1, 10, 50, 100+ items
- Test all breakpoints (mobile, tablet, desktop)
- Test keyboard navigation
- Test screen reader compatibility

## 10. Correctness Properties

### 10.1 Pagination Logic Properties

**Property 1.1**: For any valid page number `p` where `1 <= p <= totalPages`, the paginated items should contain exactly `itemsPerPage` items, except for the last page which may contain fewer.

**Validates**: Requirements 3.1, 3.2, 3.3, 3.4

**Property 1.2**: The union of all paginated pages should equal the complete filtered dataset, with no duplicates or missing items.

**Validates**: Requirements 3.1, 3.2, 3.3, 3.4

**Property 1.3**: Changing the page number should never modify the underlying data array.

**Validates**: Requirements 3.1, 3.2, 3.3, 3.4

### 10.2 Navigation Properties

**Property 2.1**: When on page 1, the "Previous" button should be disabled. When on the last page, the "Next" button should be disabled.

**Validates**: Requirements 4.3

**Property 2.2**: Clicking "Next" from page `p` should navigate to page `p+1` (if not on last page). Clicking "Previous" from page `p` should navigate to page `p-1` (if not on first page).

**Validates**: Requirements 3.1, 3.2, 3.3, 3.4

### 10.3 Filter Integration Properties

**Property 3.1**: When search/filter criteria change, pagination should reset to page 1.

**Validates**: Requirements 3.1, 3.4

**Property 3.2**: The total number of pages should update correctly when filters reduce or increase the dataset size.

**Validates**: Requirements 3.1, 3.2, 3.3, 3.4

### 10.4 State Persistence Properties

**Property 4.1**: The current page number should be reflected in the URL query parameters.

**Validates**: Requirements 4.1

**Property 4.2**: Navigating back to a paginated page should restore the previous page number from the URL.

**Validates**: Requirements 3.1

## 11. Implementation Order

1. Create `usePagination` hook
2. Create `Pagination` component
3. Integrate into `FirmsList.jsx`
4. Integrate into `TicketList.jsx`
5. Integrate into `FirmDetail.jsx`
6. Integrate into `TeamList.jsx`
7. Add URL state persistence
8. Test and refine responsive behavior
9. Accessibility audit and fixes
