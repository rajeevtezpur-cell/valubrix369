import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { getLocalityDistribution } from "../engines/linearRegressionEngine";

export default function LocalityDataDistributionPage() {
  const data = useMemo(() => getLocalityDistribution(), []);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"count" | "price">("count");

  const totalRecords = data.reduce((s, d) => s + d.recordCount, 0);
  const overallAvg = Math.round(
    data.reduce((s, d) => s + d.avgPricePerSqft * d.recordCount, 0) /
      totalRecords,
  );

  const filtered = data
    .filter((d) => d.locality.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) =>
      sortBy === "count"
        ? b.recordCount - a.recordCount
        : b.avgPricePerSqft - a.avgPricePerSqft,
    );

  const maxCount = Math.max(...data.map((d) => d.recordCount));
  const maxPrice = Math.max(...data.map((d) => d.avgPricePerSqft));

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link to="/admin" className="text-gray-400 hover:text-white text-sm">
            ← Admin
          </Link>
          <span className="text-gray-600">/</span>
          <h1 className="text-2xl font-bold text-white">
            Data Distribution by Locality
          </h1>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">
              Total Real Records
            </div>
            <div className="text-3xl font-bold text-emerald-400">
              {totalRecords}
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">
              Total Localities
            </div>
            <div className="text-3xl font-bold text-blue-400">
              {data.length}
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">
              Overall Avg Price/sqft
            </div>
            <div className="text-3xl font-bold text-purple-400">
              ₹{overallAvg.toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        {/* Bar chart — record count */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
            Records per Locality (top 20)
          </h2>
          <div className="space-y-2">
            {data.slice(0, 20).map((d) => (
              <div key={d.locality} className="flex items-center gap-3">
                <div className="w-48 text-xs text-gray-400 truncate text-right shrink-0">
                  {d.locality}
                </div>
                <div className="flex-1 bg-gray-800 rounded-full h-5 relative">
                  <div
                    className="h-5 rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${(d.recordCount / maxCount) * 100}%` }}
                  />
                  <span className="absolute inset-0 flex items-center px-2 text-xs font-semibold text-white">
                    {d.recordCount} records
                  </span>
                </div>
                <div className="w-32 text-xs text-gray-300 text-right shrink-0">
                  ₹{d.avgPricePerSqft.toLocaleString("en-IN")}/sqft
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Avg price bar chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
            Avg Price/sqft by Locality (top 20 by price)
          </h2>
          <div className="space-y-2">
            {[...data]
              .sort((a, b) => b.avgPricePerSqft - a.avgPricePerSqft)
              .slice(0, 20)
              .map((d) => (
                <div key={d.locality} className="flex items-center gap-3">
                  <div className="w-48 text-xs text-gray-400 truncate text-right shrink-0">
                    {d.locality}
                  </div>
                  <div className="flex-1 bg-gray-800 rounded-full h-5 relative">
                    <div
                      className="h-5 rounded-full bg-purple-500 transition-all"
                      style={{
                        width: `${(d.avgPricePerSqft / maxPrice) * 100}%`,
                      }}
                    />
                    <span className="absolute inset-0 flex items-center px-2 text-xs font-semibold text-white">
                      ₹{d.avgPricePerSqft.toLocaleString("en-IN")}/sqft
                    </span>
                  </div>
                  <div className="w-24 text-xs text-gray-400 text-right shrink-0">
                    {d.recordCount} rec
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center gap-4">
            <input
              type="text"
              placeholder="Search locality..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSortBy("count")}
                className={`px-3 py-2 rounded-lg text-xs font-medium ${
                  sortBy === "count"
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                Sort by Records
              </button>
              <button
                type="button"
                onClick={() => setSortBy("price")}
                className={`px-3 py-2 rounded-lg text-xs font-medium ${
                  sortBy === "price"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                Sort by Price
              </button>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800/50 text-gray-400 text-xs uppercase">
                <th className="text-left px-4 py-3">#</th>
                <th className="text-left px-4 py-3">Locality</th>
                <th className="text-right px-4 py-3">Records</th>
                <th className="text-right px-4 py-3">Avg ₹/sqft</th>
                <th className="text-right px-4 py-3">Min ₹/sqft</th>
                <th className="text-right px-4 py-3">Max ₹/sqft</th>
                <th className="text-left px-4 py-3">Types</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => (
                <tr
                  key={d.locality}
                  className="border-t border-gray-800 hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-white">
                    {d.locality}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center justify-center bg-emerald-900/40 text-emerald-400 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                      {d.recordCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-purple-300">
                    ₹{d.avgPricePerSqft.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400">
                    ₹{d.minPricePerSqft.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400">
                    ₹{d.maxPricePerSqft.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {d.propertyTypes.map((t) => (
                        <span
                          key={t}
                          className="text-xs bg-blue-900/40 text-blue-300 rounded px-1.5 py-0.5 capitalize"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-10 text-center text-gray-500">
              No localities found for "{search}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
