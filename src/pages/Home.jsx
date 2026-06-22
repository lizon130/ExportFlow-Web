import { useState, useEffect } from 'react'

function Home() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const today = new Date().toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)
  const allUnits =  [
                        { id: '', name: 'All Units' },
                        { id: '1', name: 'Unit 1' }, 
                        { id: '2', name: 'Unit 2' }, 
                        { id: '3', name: 'Unit 3' },
                        { id: '4', name: 'Unit 4' },
                        { id: '5', name: 'Unit 5' },
                        { id: '6', name: 'Unit 6' }
                    ];

  const [unitId, setUnitId] = useState('')

  const fetchData = () => {
    setLoading(true)
    setError('')

    const url = `http://192.168.136.52:5000/api/Wash-Machine/date-counts?unit_id=${unitId}&date_from=${dateFrom}&date_to=${dateTo}`

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
        return res.json()
      })
      .then((resData) => {
        if (resData.success) {
          setData(resData.data.total_summation)
        } else {
          setError('API returned unsuccessful response')
        }
      })
      .catch((err) => {
        console.error(err)
        setError('Failed to fetch data')
      })
      .finally(() => setLoading(false))
  }

  // Fetch on first render
  useEffect(() => {
    fetchData()
  }, [])

  // Handler when user clicks "Filter"
  const handleFilter = (e) => {
    e.preventDefault()
    fetchData()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Wash Machine Summary</h2>

      {/* Filter Form */}
      <form onSubmit={handleFilter} className="flex flex-wrap gap-4 mb-6 items-end">
        <div>
          <label className="block text-gray-600 mb-1">From:</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>

        <div>
          <label className="block text-gray-600 mb-1">To:</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>

        <div>
          <label className="block text-gray-600 mb-1">Unit ID:</label>
          <input
            type="text"
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            className="border rounded px-2 py-1 w-20"
          />
        </div>

        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Filter
        </button>
      </form>

      {/* Loading & Error */}
      {loading && <p className="text-blue-500 font-bold">Loading...</p>}
      {error && <p className="text-red-500 font-bold">{error}</p>}

      {/* Data Display */}
      {data && !loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-white shadow rounded">
            <p className="font-semibold text-gray-600">Date Range</p>
            <p className="text-gray-800">{data.date_range.display_date_range}</p>
          </div>

          <div className="p-4 bg-white shadow rounded">
            <p className="font-semibold text-gray-600">Unit</p>
            <p className="text-gray-800">{data.unit_selection.unit_name} (ID: {data.unit_selection.unit_id})</p>
          </div>

          <div className="p-4 bg-white shadow rounded">
            <p className="font-semibold text-gray-600">Base Machine Count</p>
            <p className="text-gray-800">{data.base_machine_count}</p>
          </div>

          <div className="p-4 bg-white shadow rounded">
            <p className="font-semibold text-gray-600">Current Machine Count</p>
            <p className="text-gray-800">{data.current_machine_count}</p>
          </div>

          <div className="p-4 bg-white shadow rounded">
            <p className="font-semibold text-gray-600">Wash Received</p>
            <p className="text-gray-800">{data.wash_received}</p>
          </div>

          <div className="p-4 bg-white shadow rounded">
            <p className="font-semibold text-gray-600">Wash Delivered</p>
            <p className="text-gray-800">{data.wash_delivery}</p>
          </div>

          <div className="p-4 bg-white shadow rounded">
            <p className="font-semibold text-gray-600">Net Machine Change</p>
            <p className="text-gray-800">{data.net_machine_change}</p>
          </div>

          <div className="p-4 bg-white shadow rounded">
            <p className="font-semibold text-gray-600">Total Wash</p>
            <p className="text-gray-800">{data.wash_total}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Home
