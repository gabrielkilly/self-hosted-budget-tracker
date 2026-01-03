// App.jsx - React Frontend for Budget Tracker
import React, { useState, useEffect } from 'react';
import './App.css';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const API_URL = 'https://api.nabitat.me/api';

const COLORS = ['#1E40AF', '#059669', '#D97706', '#DC2626', '#7C3AED', '#0891B2', '#BE185D', '#EA580C', '#15803D', '#6366F1'];

function App() {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chart');
  const [filters, setFilters] = useState({
    budget_type: '',
    start_date: '',
    end_date: '',
    limit: 50,
    payedOff: 'all'
  });
  const [budgetTypes, setBudgetTypes] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [monthlyTransactions, setMonthlyTransactions] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    name: '',
    description: '',
    budget_type: '',
    amount: '',
    payedOff: false
  });
  const [formMessage, setFormMessage] = useState({ type: '', text: '' });
  const [unpaidTransactions, setUnpaidTransactions] = useState([]);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Fetch data on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  // Apply dark mode class to body
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchTransactions(),
        fetchStats(),
        fetchTrends(),
        fetchBudgetTypes(),
        fetchAvailableMonths(),
        fetchUnpaidTransactions()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    const params = new URLSearchParams();
    if (filters.budget_type) params.append('budget_type', filters.budget_type);
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    params.append('limit', filters.limit);

    const response = await fetch(`${API_URL}/transactions?${params}`);
    const data = await response.json();
    if (data.success) {
      let filteredData = data.data;
      // Client-side filter for payedOff status
      if (filters.payedOff === 'paid') {
        filteredData = filteredData.filter(t => t.payedOff === true || t.payedOff === 1);
      } else if (filters.payedOff === 'unpaid') {
        filteredData = filteredData.filter(t => t.payedOff === false || t.payedOff === 0);
      }
      setTransactions(filteredData);
    }
  };

  const fetchStats = async () => {
    const response = await fetch(`${API_URL}/stats/overview`);
    const data = await response.json();
    if (data.success) setStats(data.data);
  };

  const fetchTrends = async () => {
    const response = await fetch(`${API_URL}/analytics/trends`);
    const data = await response.json();
    if (data.success) setTrends(data.data);
  };

  const fetchBudgetTypes = async () => {
    const response = await fetch(`${API_URL}/budget-types`);
    const data = await response.json();
    if (data.success) setBudgetTypes(data.data);
  };

  const fetchUnpaidTransactions = async () => {
    const response = await fetch(`${API_URL}/transactions?limit=1000`);
    const data = await response.json();
    if (data.success) {
      // Filter for unpaid transactions only (payedOff = false or 0)
      const unpaid = data.data.filter(t => t.payedOff === false || t.payedOff === 0);
      setUnpaidTransactions(unpaid);
    }
  };

  const fetchAvailableMonths = async () => {
    const response = await fetch(`${API_URL}/available-months`);
    const data = await response.json();
    if (data.success) {
      setAvailableMonths(data.data);
      if (data.data.length > 0) {
        setSelectedMonth(data.data[0]); // Set the most recent month as default
      }
    }
  };

  const fetchCategoryData = async (month) => {
    if (!month) return;
    const response = await fetch(`${API_URL}/analytics/category-breakdown?month=${month}`);
    const data = await response.json();
    if (data.success) {
      setCategoryData(data.data.map(item => ({
        name: item.budget_type,
        value: parseFloat(item.total_amount),
        count: item.transaction_count
      })));
    }
  };

  const fetchMonthlyTransactions = async (month) => {
    if (!month) return;
    // Get first and last day of the month
    const startDate = `${month}-01`;
    // Get the last day: month is 1-indexed in the string but Date expects 0-indexed
    // So for "2025-10", we want October which is month index 9
    const [year, monthNum] = month.split('-');
    // parseInt(monthNum) gives us 10 for October, but Date months are 0-indexed
    // So we pass monthNum directly (as 10) which Date treats as November (index 10)
    // Then day 0 gives us the last day of October
    const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
    const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

    console.log('Fetching transactions for:', { month, startDate, endDate });
    const response = await fetch(`${API_URL}/transactions?start_date=${startDate}&end_date=${endDate}&limit=1000`);
    const data = await response.json();
    console.log('Received transactions:', data.data?.length, 'transactions');
    if (data.success) {
      setMonthlyTransactions(data.data);
    }
  };

  // Fetch category data when selected month changes
  useEffect(() => {
    if (selectedMonth) {
      fetchCategoryData(selectedMonth);
      fetchMonthlyTransactions(selectedMonth);
    }
  }, [selectedMonth]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedTransactions = React.useMemo(() => {
    let sortableItems = [...monthlyTransactions];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [monthlyTransactions, sortConfig]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const applyFilters = () => {
    fetchTransactions();
  };

  const resetFilters = () => {
    setFilters({ budget_type: '', start_date: '', end_date: '', limit: 50, payedOff: 'all' });
    setTimeout(fetchTransactions, 100);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFormMessage({ type: '', text: '' });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormMessage({ type: '', text: '' });

    if (!formData.date || !formData.budget_type || !formData.amount) {
      setFormMessage({ type: 'error', text: 'Please fill in all required fields (Date, Category, Amount)' });
      return;
    }

    if (isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      setFormMessage({ type: 'error', text: 'Please enter a valid amount greater than 0' });
      return;
    }

    try {
      const response = await fetch(`${API_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: formData.date,
          name: formData.name || null,
          description: formData.description || null,
          budget_type: formData.budget_type,
          amount: parseFloat(formData.amount),
          payedOff: formData.payedOff
        })
      });

      const data = await response.json();

      if (data.success) {
        setFormMessage({ type: 'success', text: 'Transaction added successfully!' });
        setFormData({
          date: new Date().toISOString().split('T')[0],
          name: '',
          description: '',
          budget_type: '',
          amount: '',
          payedOff: false
        });
        fetchAllData();
      } else {
        setFormMessage({ type: 'error', text: data.error || 'Failed to add transaction' });
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
      setFormMessage({ type: 'error', text: 'Network error. Please try again.' });
    }
  };

  const handleEdit = (transaction) => {
    setEditingTransaction({
      ...transaction,
      date: transaction.date.split('T')[0] // Ensure proper date format
    });
    setActiveTab('edit');
  };

  const handleCancelEdit = () => {
    setEditingTransaction(null);
    setActiveTab('transactions');
  };

  const handleUpdateTransaction = async (e) => {
    e.preventDefault();

    if (!editingTransaction.date || !editingTransaction.budget_type || !editingTransaction.amount) {
      alert('Please fill in all required fields (Date, Category, Amount)');
      return;
    }

    if (isNaN(parseFloat(editingTransaction.amount)) || parseFloat(editingTransaction.amount) <= 0) {
      alert('Please enter a valid amount greater than 0');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/transactions/${editingTransaction.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: editingTransaction.date,
          name: editingTransaction.name || null,
          description: editingTransaction.description || null,
          budget_type: editingTransaction.budget_type,
          amount: parseFloat(editingTransaction.amount),
          payedOff: editingTransaction.payedOff
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('Transaction updated successfully!');
        setEditingTransaction(null);
        setActiveTab('transactions');
        fetchAllData();
      } else {
        alert(data.error || 'Failed to update transaction');
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
      alert('Network error. Please try again.');
    }
  };

  const handleDelete = (transaction) => {
    setShowDeleteConfirm(transaction);
  };

  const confirmDelete = async () => {
    if (!showDeleteConfirm) return;

    try {
      const response = await fetch(`${API_URL}/transactions/${showDeleteConfirm.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        alert('Transaction deleted successfully!');
        setShowDeleteConfirm(null);
        fetchAllData();
      } else {
        alert(data.error || 'Failed to delete transaction');
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Network error. Please try again.');
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(null);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading your budget data...</p>
      </div>
    );
  }

  return (
    <div className="App">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <nav className="sidebar-nav">
          <button
            className={activeTab === 'chart' ? 'active' : ''}
            onClick={() => setActiveTab('chart')}
          >
            📊 Category Chart
          </button>
          <button
            className={activeTab === 'transactions' ? 'active' : ''}
            onClick={() => setActiveTab('transactions')}
          >
            💳 Transactions
          </button>
          <button
            className={activeTab === 'trends' ? 'active' : ''}
            onClick={() => setActiveTab('trends')}
          >
            📈 Trends
          </button>
          <button
            className={activeTab === 'unpaid' ? 'active' : ''}
            onClick={() => setActiveTab('unpaid')}
          >
            💰 Unpaid
          </button>
          <button
            className={activeTab === 'add' ? 'active' : ''}
            onClick={() => setActiveTab('add')}
          >
            ➕ Add Transaction
          </button>
        </nav>

        <button className="dark-mode-toggle" onClick={toggleDarkMode} aria-label="Toggle dark mode">
          {darkMode ? '☀️ Light' : '🌙 Dark'}
        </button>
      </aside>

      {/* Main Content */}
      <main className="main-content">

      {/* Category Chart Tab */}
      {activeTab === 'chart' && (
        <div className="tab-content">
          <h2>Spending by Category</h2>
          <div className="chart-controls">
            <label htmlFor="month-select">Select Month: </label>
            <select
              id="month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="month-selector"
            >
              {availableMonths.map((month) => {
                const [year, monthNum] = month.split('-');
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                const displayName = `${monthNames[parseInt(monthNum) - 1]} ${year}`;
                return (
                  <option key={month} value={month}>
                    {displayName}
                  </option>
                );
              })}
            </select>
          </div>

          {categoryData.length > 0 ? (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: '#f5f5f5', border: '1px solid #ccc' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>

              <div className="chart-summary">
                <h3>Category Details</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Amount</th>
                      <th>Transactions</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryData.map((item, index) => {
                      const total = categoryData.reduce((sum, i) => sum + i.value, 0);
                      const percentage = ((item.value / total) * 100).toFixed(1);
                      return (
                        <tr key={index}>
                          <td>
                            <span
                              className="color-indicator"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            ></span>
                            {item.name}
                          </td>
                          <td className="amount">{formatCurrency(item.value)}</td>
                          <td>{item.count}</td>
                          <td>{percentage}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="no-data">
              <p>No data available for the selected month.</p>
            </div>
          )}

          {/* Monthly Transactions Detail */}
          <div className="monthly-transactions">
            <h3>All Transactions for {(() => {
              const [year, monthNum] = selectedMonth.split('-');
              const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
              return `${monthNames[parseInt(monthNum) - 1]} ${year}`;
            })()}</h3>
            <p className="transaction-count">Total: {monthlyTransactions.length} transactions</p>

            {sortedTransactions.length > 0 ? (
              <div className="transactions-table">
                <table>
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('date')} className="sortable">
                        Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('name')} className="sortable">
                        Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('description')} className="sortable">
                        Description {sortConfig.key === 'description' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('budget_type')} className="sortable">
                        Category {sortConfig.key === 'budget_type' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('amount')} className="sortable">
                        Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('payedOff')} className="sortable">
                        Status {sortConfig.key === 'payedOff' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTransactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td>{formatDate(transaction.date)}</td>
                        <td>{transaction.name}</td>
                        <td>{transaction.description}</td>
                        <td>
                          <span className="badge">{transaction.budget_type}</span>
                        </td>
                        <td className="amount">{formatCurrency(transaction.amount)}</td>
                        <td>
                          <span className={`status-badge ${transaction.payedOff || transaction.payedOff === 1 ? 'paid' : 'unpaid'}`}>
                            {transaction.payedOff || transaction.payedOff === 1 ? '✓ Paid' : '✗ Unpaid'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No transactions found for this month.</p>
            )}
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="tab-content">
          <div className="filters-section">
            <h2>Filter Transactions</h2>
            <div className="filters">
              <select name="budget_type" value={filters.budget_type} onChange={handleFilterChange}>
                <option value="">All Budget Types</option>
                {budgetTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              <input
                type="date"
                name="start_date"
                value={filters.start_date}
                onChange={handleFilterChange}
                placeholder="Start Date"
              />

              <input
                type="date"
                name="end_date"
                value={filters.end_date}
                onChange={handleFilterChange}
                placeholder="End Date"
              />

              <select name="payedOff" value={filters.payedOff} onChange={handleFilterChange}>
                <option value="all">All Status</option>
                <option value="paid">Paid Only</option>
                <option value="unpaid">Unpaid Only</option>
              </select>

              <select name="limit" value={filters.limit} onChange={handleFilterChange}>
                <option value="25">25 results</option>
                <option value="50">50 results</option>
                <option value="100">100 results</option>
                <option value="200">200 results</option>
              </select>

              <button onClick={applyFilters} className="btn-primary">Apply Filters</button>
              <button onClick={resetFilters} className="btn-secondary">Reset</button>
            </div>
          </div>

          <div className="transactions-table">
            <h2>Recent Transactions ({transactions.length})</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Budget Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{formatDate(transaction.date)}</td>
                    <td>{transaction.name}</td>
                    <td>{transaction.description}</td>
                    <td>
                      <span className="badge">{transaction.budget_type}</span>
                    </td>
                    <td className="amount">{formatCurrency(transaction.amount)}</td>
                    <td>
                      <span className={`status-badge ${transaction.payedOff || transaction.payedOff === 1 ? 'paid' : 'unpaid'}`}>
                        {transaction.payedOff || transaction.payedOff === 1 ? '✓ Paid' : '✗ Unpaid'}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button
                        className="btn-icon btn-edit"
                        onClick={() => handleEdit(transaction)}
                        title="Edit transaction"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-icon btn-delete"
                        onClick={() => handleDelete(transaction)}
                        title="Delete transaction"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trends Tab */}
      {activeTab === 'trends' && (
        <div className="tab-content">
          <h2>Monthly Spending Trends</h2>
          <div className="trends-table">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Total Spending</th>
                  <th>Transactions</th>
                  <th>Avg per Transaction</th>
                </tr>
              </thead>
              <tbody>
                {trends.map((trend, index) => (
                  <tr key={index}>
                    <td>{formatDate(trend.month)}</td>
                    <td className="amount">{formatCurrency(trend.total_spending)}</td>
                    <td>{trend.transaction_count}</td>
                    <td>{formatCurrency(trend.avg_transaction)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Unpaid Tab */}
      {activeTab === 'unpaid' && (
        <div className="tab-content">
          <h2>Unpaid Transactions</h2>
          <p className="unpaid-summary">
            Total Unpaid: <strong>{unpaidTransactions.length}</strong> transactions -
            <strong className="amount-highlight"> {formatCurrency(unpaidTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0))}</strong>
          </p>

          {unpaidTransactions.length > 0 ? (
            <div className="unpaid-by-category">
              {(() => {
                // Group transactions by budget_type
                const grouped = unpaidTransactions.reduce((acc, transaction) => {
                  const category = transaction.budget_type || 'Uncategorized';
                  if (!acc[category]) {
                    acc[category] = [];
                  }
                  acc[category].push(transaction);
                  return acc;
                }, {});

                // Sort categories alphabetically
                const sortedCategories = Object.keys(grouped).sort();

                return sortedCategories.map((category) => {
                  const categoryTransactions = grouped[category];
                  const categoryTotal = categoryTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);

                  return (
                    <div key={category} className="category-group">
                      <h3 className="category-header">
                        <span className="category-name">{category}</span>
                        <span className="category-count">({categoryTransactions.length} transactions)</span>
                      </h3>

                      <table className="unpaid-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Name</th>
                            <th>Description</th>
                            <th>Amount</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {categoryTransactions.map((transaction) => (
                            <tr key={transaction.id}>
                              <td>{formatDate(transaction.date)}</td>
                              <td>{transaction.name}</td>
                              <td>{transaction.description}</td>
                              <td className="amount">{formatCurrency(transaction.amount)}</td>
                              <td className="actions-cell">
                                <button
                                  className="btn-icon btn-edit"
                                  onClick={() => handleEdit(transaction)}
                                  title="Edit transaction"
                                >
                                  ✏️
                                </button>
                                <button
                                  className="btn-icon btn-delete"
                                  onClick={() => handleDelete(transaction)}
                                  title="Delete transaction"
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          ))}
                          <tr className="category-total-row">
                            <td colSpan="4" className="total-label">
                              <strong>{category} Total:</strong>
                            </td>
                            <td className="amount total-amount">
                              <strong>{formatCurrency(categoryTotal)}</strong>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            <div className="no-data">
              <p>🎉 No unpaid transactions! All caught up!</p>
            </div>
          )}
        </div>
      )}

      {/* Add Transaction Tab */}
      {activeTab === 'add' && (
        <div className="tab-content">
          <h2>Add New Transaction</h2>
          <div className="add-transaction-form">
            <form onSubmit={handleFormSubmit}>
              {formMessage.text && (
                <div className={`form-message ${formMessage.type}`}>
                  {formMessage.text}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="date">Date <span className="required">*</span></label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="budget_type">Category <span className="required">*</span></label>
                <select
                  id="budget_type"
                  name="budget_type"
                  value={formData.budget_type}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">Select a category</option>
                  {budgetTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="amount">Amount <span className="required">*</span></label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleFormChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="e.g., Coffee Shop, Grocery Store"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  placeholder="Additional details (optional)"
                  rows="3"
                />
              </div>

              <div className="form-group checkbox-group">
                <label htmlFor="payedOff" className="checkbox-label">
                  <input
                    type="checkbox"
                    id="payedOff"
                    name="payedOff"
                    checked={formData.payedOff}
                    onChange={(e) => setFormData({ ...formData, payedOff: e.target.checked })}
                  />
                  <span>Paid Off</span>
                </label>
                <p className="form-hint">Check if this transaction has been paid off</p>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">Add Transaction</button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setFormData({
                      date: new Date().toISOString().split('T')[0],
                      name: '',
                      description: '',
                      budget_type: '',
                      amount: '',
                      payedOff: false
                    });
                    setFormMessage({ type: '', text: '' });
                  }}
                >
                  Clear Form
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Transaction Tab */}
      {activeTab === 'edit' && editingTransaction && (
        <div className="tab-content">
          <h2>Edit Transaction</h2>
          <div className="add-transaction-form">
            <form onSubmit={handleUpdateTransaction}>
              <div className="form-group">
                <label htmlFor="edit-date">Date <span className="required">*</span></label>
                <input
                  type="date"
                  id="edit-date"
                  value={editingTransaction.date}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-budget_type">Category <span className="required">*</span></label>
                <select
                  id="edit-budget_type"
                  value={editingTransaction.budget_type}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, budget_type: e.target.value })}
                  required
                >
                  <option value="">Select a category</option>
                  {budgetTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="edit-amount">Amount <span className="required">*</span></label>
                <input
                  type="number"
                  id="edit-amount"
                  value={editingTransaction.amount}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, amount: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-name">Name</label>
                <input
                  type="text"
                  id="edit-name"
                  value={editingTransaction.name || ''}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, name: e.target.value })}
                  placeholder="e.g., Coffee Shop, Grocery Store"
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-description">Description</label>
                <textarea
                  id="edit-description"
                  value={editingTransaction.description || ''}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, description: e.target.value })}
                  placeholder="Additional details (optional)"
                  rows="3"
                />
              </div>

              <div className="form-group checkbox-group">
                <label htmlFor="edit-payedOff" className="checkbox-label">
                  <input
                    type="checkbox"
                    id="edit-payedOff"
                    checked={editingTransaction.payedOff || editingTransaction.payedOff === 1}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, payedOff: e.target.checked })}
                  />
                  <span>Paid Off</span>
                </label>
                <p className="form-hint">Check if this transaction has been paid off</p>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">Update Transaction</button>
                <button type="button" className="btn-secondary" onClick={handleCancelEdit}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Confirm Delete</h2>
            <p>Are you sure you want to delete this transaction?</p>
            <div className="transaction-details">
              <p><strong>Date:</strong> {formatDate(showDeleteConfirm.date)}</p>
              <p><strong>Name:</strong> {showDeleteConfirm.name}</p>
              <p><strong>Category:</strong> {showDeleteConfirm.budget_type}</p>
              <p><strong>Amount:</strong> {formatCurrency(showDeleteConfirm.amount)}</p>
            </div>
            <div className="modal-actions">
              <button className="btn-danger" onClick={confirmDelete}>
                Yes, Delete
              </button>
              <button className="btn-secondary" onClick={cancelDelete}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}

export default App;
