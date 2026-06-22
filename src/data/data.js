
export const columns = [
  { header: 'ID', accessorKey: 'id' },
  { header: 'Name', accessorKey: 'name' },
  { header: 'Email', accessorKey: 'email' },
  { header: 'Test', accessorKey: 'test' },
  { header: 'Created At', accessorKey: 'createdAt' },
];

// generate 1000 rows for testing
export const data = Array.from({ length: 50 }, (_, i) => (
  {
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    test: `Test ${i + 3}`,
    createdAt: new Date().toISOString().slice(0, 10),
  }
));

