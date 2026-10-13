import { useState } from 'react';
import { View } from 'react-native';
import { Txn } from '../api';
import { usePaged } from '../hooks';
import { Chips } from '../components/ui';
import { TxnItem } from '../components/TxnItem';
import { groupStyle, PagedList } from '../components/PagedList';

const ADMIN_FILTERS = [
  { key: '', label: 'All' },
  { key: 'transfer', label: 'Transfers' },
  { key: 'sale', label: 'Sales' },
  { key: 'stock_add', label: 'Stock in' },
  { key: 'stock_remove', label: 'Stock out' },
];

// Admin: whole ledger with filters. User: own history. Loads more on scroll.
export default function ActivityScreen({ admin = false }: { admin?: boolean }) {
  const [filter, setFilter] = useState('');
  const path = admin ? `/admin/transactions${filter ? `?type=${filter}` : ''}` : '/kits/history';
  const paged = usePaged<Txn>(path);

  return (
    <PagedList
      paged={paged}
      header={admin ? <Chips options={ADMIN_FILTERS} value={filter} onChange={setFilter} /> : undefined}
      emptyText="No activity yet"
      emptyIcon="time-outline"
      renderItem={({ item, index }) => (
        <View style={groupStyle(index, paged.items.length)}>
          <TxnItem t={item} perspective={admin ? 'all' : 'self'} />
        </View>
      )}
    />
  );
}
