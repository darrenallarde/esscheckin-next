# Families

View and manage parent/family relationships for your students.

## Overview

The Families feature provides a centralized view of all parents and guardians
across your ministry, with automatic sibling detection based on shared contact info.

## Features

### Families Page

Located at `/{org}/families`, this page shows:

- **Search**: Find parents by name, phone, or student name
- **Filter**: View all, mothers only, fathers only, or guardians
- **Contact**: Quick call/text buttons for each parent
- **Children**: See all students linked to each parent

### Sibling Detection

Students are automatically identified as siblings when they share a parent phone number:

- Same mother's phone → siblings (mother's side)
- Same father's phone → siblings (father's side)
- Both match → full siblings

### Student Profile Integration

Each student's profile now includes a "Family" tab showing:

- Parent/guardian contact information with call/text buttons
- Siblings with click-to-navigate to their profiles

## Data Model

Parent data is stored directly in the `students` table (denormalized):

| Column | Type | Description |
|--------|------|-------------|
| `mother_first_name` | text | Mother's first name |
| `mother_last_name` | text | Mother's last name |
| `mother_phone` | text | Mother's phone number |
| `mother_email` | text | Mother's email address |
| `father_first_name` | text | Father's first name |
| `father_last_name` | text | Father's last name |
| `father_phone` | text | Father's phone number |
| `father_email` | text | Father's email address |
| `parent_name` | text | Legacy: guardian name |
| `parent_phone` | text | Legacy: guardian phone |

**Note:** There is no separate parents table. Data is aggregated at query time via RPC functions.

## Database Functions

### `get_organization_parents(p_organization_id)`

Returns all unique parents for an organization:

```sql
SELECT * FROM get_organization_parents('org-uuid');
```

Returns:
- `parent_id` - Unique identifier (format: `{type}_{phone}`)
- `parent_type` - 'mother', 'father', or 'guardian'
- `first_name`, `last_name` - Parent name
- `phone`, `email` - Contact info
- `children` - JSONB array of linked students

### `get_student_siblings(p_student_id)`

Returns siblings for a specific student:

```sql
SELECT * FROM get_student_siblings('student-uuid');
```

Returns:
- `student_id` - Sibling's UUID
- `first_name`, `last_name` - Sibling's name
- `grade` - Sibling's grade
- `relationship` - 'sibling', 'sibling (mother's side)', etc.

## Analytics Events

| Event | When | Properties |
|-------|------|------------|
| `Families Page Viewed` | User opens Families page | `parent_count` |
| `Parent Searched` | User searches in Families | `search_term_length`, `result_count` |
| `Parent Card Clicked` | User clicks a parent card | `parent_type`, `children_count` |
| `Parent Called` | User clicks call button | `parent_type` |
| `Parent Texted` | User clicks text button | `parent_type` |
| `Sibling Clicked` | User clicks sibling in profile | `sibling_id` |

## Component Structure

```
src/
├── app/(protected)/[org]/families/
│   └── page.tsx              # Families listing page
├── components/families/
│   ├── ParentCard.tsx        # Parent card component
│   ├── ParentProfileModal.tsx # Parent detail modal
│   └── FamilySection.tsx     # Family section for student profile
├── hooks/queries/
│   ├── use-families.ts       # useOrganizationParents, useStudentSiblings
│   └── use-student-details.ts # useStudentParents
└── types/
    └── families.ts           # TypeScript types
```

## Future Enhancements

- Parent portal for self-service check-in and profile updates
- Family group messaging
- Parent engagement tracking
- Emergency contact designation
