import React, { useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend
} from "recharts";
 
function App() {
//love God//
// =====================================
// STATES
// =====================================

const [employees, setEmployees] = useState([]);

const [filteredEmployees, setFilteredEmployees] =
  useState([]);

const [forecastData, setForecastData] =
  useState([]);

const [search, setSearch] = useState("");

const [departmentFilter, setDepartmentFilter] =
  useState("All Departments");

const [burnoutFilter, setBurnoutFilter] =
  useState("All Burnout");

const [predictionResult, setPredictionResult] =
  useState("");


const [predictionForm, setPredictionForm] =
  useState({

    total_hours: "",
    idle_time_minutes: "",
    overtime_hours: "",
    break_count: "",
    meeting_hours: "",
    tasks_completed: "",
    bugs_fixed: "",
    focus_score: "",
    weekly_target: "",
    target_completed: "",
    manager_rating: ""

});

  // =====================================
  // FILE UPLOAD
  // =====================================

  const handleFileUpload = (e) => {

    const file = e.target.files[0];

    if (!file) return;

    const extension =
      file.name.split(".").pop();

    // CSV

    if (extension === "csv") {

      Papa.parse(file, {

        header: true,
        skipEmptyLines: true,

        complete: function (results) {

          processEmployeeData(results.data);

        }

      });

    }

    // XLSX

    else if (
      extension === "xlsx" ||
      extension === "xls"
    ) {

      const reader = new FileReader();

      reader.onload = (event) => {

        const data = new Uint8Array(
          event.target.result
        );

        const workbook = XLSX.read(data, {
          type: "array"
        });

        const sheetName =
          workbook.SheetNames[0];

        const worksheet =
          workbook.Sheets[sheetName];

        const jsonData =
          XLSX.utils.sheet_to_json(worksheet);

        processEmployeeData(jsonData);

      };

      reader.readAsArrayBuffer(file);

    }

  };

  // =====================================
  // PROCESS DATA
  // =====================================

  const processEmployeeData = (data) => {

    const processed = data.map((emp) => {

      const totalHours = Number(
        emp["Total Working Hours Per Day"] || 0
      );

      const overtime = Number(
        emp["Overtime Hours"] || 0
      );

      const productivity = Number(
        emp["Productivity Score"] || 0
      );

      const productiveHours = Number(
        emp["Net Productive Hours"] || 0
      );

      const taskName =
        emp["Task Name"] || "No Task";

      const projectName =
        emp["Project Name"] || "No Project";

      const employeeName =
        emp["Employee Name"] || "Unknown";

      const status =
        emp["Status"] || "Regular";

      // =================================
      // BURNOUT LOGIC
      // =================================

      let burnout = "Low";

      if (
        overtime >= 1 ||
        productivity < 50 ||
        totalHours > 9
      ) {

        burnout = "High";

      }

      else if (
        productivity < 75
      ) {

        burnout = "Medium";

      }

      return {

        employee_name: employeeName,

        project_name: projectName,

        task_name: taskName,

        productivity: productivity,

        productive_hours: productiveHours,

        total_hours: totalHours,

        overtime_hours: overtime,

        burnout_risk: burnout,

        status: status

      };

    });

    setEmployees(processed);

    setFilteredEmployees(processed);
    generateWeeklyForecast(processed);

  };

  // =====================================
  // KPI
  // =====================================

  const totalEmployees =
    filteredEmployees.length;

  const highBurnout =
    filteredEmployees.filter(
      (e) => e.burnout_risk === "High"
    ).length;

  const avgProductivity =
    filteredEmployees.length > 0

      ? (
          filteredEmployees.reduce(
            (sum, emp) =>
              sum + Number(emp.productivity || 0),
            0
          ) / filteredEmployees.length
        ).toFixed(0)

      : 0;

  const overtimeEmployees =
    filteredEmployees.filter(
      (e) => Number(e.overtime_hours) > 0
    ).length;

  // =====================================
  // CHART DATA
  // =====================================

  // =====================================
// DYNAMIC FORECAST DATA
// =====================================

const generateWeeklyForecast = (employeeData) => {

  const weeklyMap = {};

  employeeData.forEach((emp, index) => {

    const week =
      `Week ${Math.floor(index / 10) + 1}`;

    const productivity =
      Number(emp.productivity || 0);

    if (!weeklyMap[week]) {

      weeklyMap[week] = {

        total: 0,
        count: 0

      };

    }

    weeklyMap[week].total += productivity;

    weeklyMap[week].count += 1;

  });

  const formattedData =

    Object.keys(weeklyMap).map((week) => ({

      week,

      productivity: Number(

        (
          weeklyMap[week].total /
          weeklyMap[week].count

        ).toFixed(2)

      )

    }));

  setForecastData(formattedData);

};

// =====================================
// DYNAMIC BURNOUT DATA
// =====================================

const burnoutData = [

  {

    name: "High",

    value:
      filteredEmployees.filter(
        (e) => e.burnout_risk === "High"
      ).length

  },

  {

    name: "Medium",

    value:
      filteredEmployees.filter(
        (e) => e.burnout_risk === "Medium"
      ).length

  },

  {

    name: "Low",

    value:
      filteredEmployees.filter(
        (e) => e.burnout_risk === "Low"
      ).length

  }

];
 

  // =====================================
  // FILTERS
  // =====================================

  const applyFilters = () => {

    let filtered = employees;

    // SEARCH

    if (search) {

      filtered = filtered.filter((emp) =>
        emp.employee_name
          .toLowerCase()
          .includes(search.toLowerCase())
      );

    }

    // PROJECT FILTER

    if (
      departmentFilter !==
      "All Departments"
    ) {

      filtered = filtered.filter(
        (emp) =>
          emp.project_name ===
          departmentFilter
      );

    }

    // BURNOUT FILTER

    if (
      burnoutFilter !==
      "All Burnout"
    ) {

      filtered = filtered.filter(
        (emp) =>
          emp.burnout_risk ===
          burnoutFilter
      );

    }

    setFilteredEmployees(filtered);

  };

  // =====================================
  // FORM CHANGE
  // =====================================

  const handlePredictionChange = (e) => {

    setPredictionForm({

      ...predictionForm,

      [e.target.name]: e.target.value

    });

  };

  // =====================================
  // AI PRODUCTIVITY PREDICTION
  // =====================================

  const predictBurnout = async () => {

    try {

      const response = await fetch(
        "http://127.0.0.1:5000/predict-productivity",

        {

          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({

            working_hours:
              predictionForm.total_hours,

            total_hours:
              predictionForm.total_hours,

            lunch_time: 1,

            break_time: 0.5,

            lunch_break: 1.5,

            total_leave: 0,

            permission: 0,

            leave_permission: 0,

            net_productive_hours:
              predictionForm.total_hours,

            overtime_hours:
              predictionForm.overtime_hours

          })

        }
      );

      const result =
        await response.json();

      setPredictionResult(
        result.predicted_productivity
      );

    }

    catch (error) {

      console.log(error);

      alert("Prediction API Error");

    }

  };

  // =====================================
  // EXPORT CSV
  // =====================================

  const exportCSV = () => {

    const csv =
      Papa.unparse(filteredEmployees);

    const blob =
      new Blob([csv]);

    const url =
      window.URL.createObjectURL(blob);

    const a =
      document.createElement("a");

    a.href = url;

    a.download =
      "employee_report.csv";

    a.click();

  };

  // =====================================
  // UI
  // =====================================

  return (

    <div style={styles.container}>

      <h1 style={styles.title}>
        AI Workforce Analytics Dashboard
      </h1>

      {/* FILE UPLOAD */}

      <input
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileUpload}
      />

      {/* KPI */}

      <div style={styles.kpiGrid}>

        <div style={styles.card}>

          <h3>Total Employees</h3>

          <h1>{totalEmployees}</h1>

        </div>

        <div style={styles.card}>

          <h3>High Burnout</h3>

          <h1>{highBurnout}</h1>

        </div>

        <div style={styles.card}>

          <h3>Avg Productivity</h3>

          <h1>{avgProductivity}%</h1>

        </div>

        <div style={styles.card}>

          <h3>Overtime Employees</h3>

          <h1>{overtimeEmployees}</h1>

        </div>

      </div>

      {/* CHARTS */}

      <div style={styles.chartGrid}>

        {/* PIE */}

        <div style={styles.chartCard}>

          <h2>Burnout Distribution</h2>

          <ResponsiveContainer
            width="100%"
            height={300}
          >

            <PieChart>

              <Pie
                data={burnoutData}
                dataKey="value"
                outerRadius={100}
                label
              >

                <Cell fill="#ef4444" />
                <Cell fill="#facc15" />
                <Cell fill="#22c55e" />

              </Pie>

              <Tooltip />

            </PieChart>

          </ResponsiveContainer>

        </div>

        {/* LINE */}

        <div style={styles.chartCard}>

          <h2>
            Weekly Productivity Forecast
          </h2>

          <ResponsiveContainer
            width="100%"
            height={300}
          >

            <LineChart
              data={forecastData}
            >

              <CartesianGrid
                strokeDasharray="3 3"
              />

              <XAxis dataKey="week" />

              <YAxis />

              <Tooltip />

              <Legend />

              <Line
                type="monotone"
                dataKey="productivity"
                stroke="#3b82f6"
              />

            </LineChart>

          </ResponsiveContainer>

        </div>

      </div>

      {/* FILTERS */}

      <div style={styles.filterRow}>

        <input
          style={styles.input}
          placeholder="Search Employee"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

        <select
          style={styles.input}
          value={departmentFilter}
          onChange={(e) =>
            setDepartmentFilter(
              e.target.value
            )
          }
        >

          <option>
            All Departments
          </option>

          {[...new Set(
            employees.map(
              (e) => e.project_name
            )
          )].map((dept, index) => (

            <option
              key={index}
            >
              {dept}
            </option>

          ))}

        </select>

        <select
          style={styles.input}
          value={burnoutFilter}
          onChange={(e) =>
            setBurnoutFilter(
              e.target.value
            )
          }
        >

          <option>
            All Burnout
          </option>

          <option>High</option>
          <option>Medium</option>
          <option>Low</option>

        </select>

        <button
          style={styles.button}
          onClick={applyFilters}
        >

          Apply Filters

        </button>

      </div>

      {/* TABLE */}

      <div style={styles.tableCard}>

        <h2>Employee Analytics</h2>

        <table style={styles.table}>

          <thead>

            <tr>

              <th>Name</th>
              <th>Project</th>
              <th>Task</th>
              <th>Productivity</th>
              <th>Burnout</th>
              <th>Hours</th>
              <th>Overtime</th>
              <th>Status</th>

            </tr>

          </thead>

          <tbody>

            {filteredEmployees.map((emp, index) => (

              <tr key={index}>

                <td>{emp.employee_name}</td>

                <td>{emp.project_name}</td>

                <td>{emp.task_name}</td>

                <td>{emp.productivity}</td>

                <td>{emp.burnout_risk}</td>

                <td>{emp.total_hours}</td>

                <td>{emp.overtime_hours}</td>

                <td>{emp.status}</td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

      {/* AI PREDICTION */}

      {/* AI PREDICTION */}

<div style={styles.predictionCard}>

  <h2>AI Productivity Prediction</h2>

  <div style={styles.formGrid}>

    <div>
      <label>Total Working Hours</label>

      <input
        type="number"
        name="total_hours"
        value={predictionForm.total_hours}
        onChange={handlePredictionChange}
        style={styles.input}
      />
    </div>

    <div>
      <label>Idle Time Minutes</label>

      <input
        type="number"
        name="idle_time_minutes"
        value={predictionForm.idle_time_minutes}
        onChange={handlePredictionChange}
        style={styles.input}
      />
    </div>

    <div>
      <label>Overtime Hours</label>

      <input
        type="number"
        name="overtime_hours"
        value={predictionForm.overtime_hours}
        onChange={handlePredictionChange}
        style={styles.input}
      />
    </div>

    <div>
      <label>Break Count</label>

      <input
        type="number"
        name="break_count"
        value={predictionForm.break_count}
        onChange={handlePredictionChange}
        style={styles.input}
      />
    </div>

    <div>
      <label>Meeting Hours</label>

      <input
        type="number"
        name="meeting_hours"
        value={predictionForm.meeting_hours}
        onChange={handlePredictionChange}
        style={styles.input}
      />
    </div>

    <div>
      <label>Tasks Completed</label>

      <input
        type="number"
        name="tasks_completed"
        value={predictionForm.tasks_completed}
        onChange={handlePredictionChange}
        style={styles.input}
      />
    </div>

    <div>
      <label>Bugs Fixed</label>

      <input
        type="number"
        name="bugs_fixed"
        value={predictionForm.bugs_fixed}
        onChange={handlePredictionChange}
        style={styles.input}
      />
    </div>

    <div>
      <label>Focus Score</label>

      <input
        type="number"
        name="focus_score"
        value={predictionForm.focus_score}
        onChange={handlePredictionChange}
        style={styles.input}
      />
    </div>

    <div>
      <label>Weekly Target</label>

      <input
        type="number"
        name="weekly_target"
        value={predictionForm.weekly_target}
        onChange={handlePredictionChange}
        style={styles.input}
      />
    </div>

    <div>
      <label>Target Completed</label>

      <input
        type="number"
        name="target_completed"
        value={predictionForm.target_completed}
        onChange={handlePredictionChange}
        style={styles.input}
      />
    </div>

    <div>
      <label>Manager Rating</label>

      <input
        type="number"
        name="manager_rating"
        value={predictionForm.manager_rating}
        onChange={handlePredictionChange}
        style={styles.input}
      />
    </div>

  </div>

  <button
    style={styles.button}
    onClick={predictBurnout}
  >
    Predict Productivity
  </button>

  {predictionResult && (

    <div style={styles.resultBox}>

      <h3>
        Predicted Productivity:
        {" "}
        {predictionResult}%
      </h3>

      {predictionResult >= 80 && (
        <p>
          Excellent Performance - Employee is highly productive.
        </p>
      )}

      {predictionResult >= 60 &&
        predictionResult < 80 && (
        <p>
          Good Performance - Productivity is stable.
        </p>
      )}

      {predictionResult >= 40 &&
        predictionResult < 60 && (
        <p>
          Average Performance - Needs improvement.
        </p>
      )}

      {predictionResult < 40 && (
        <p>
          Poor Performance - High burnout risk detected.
        </p>
      )}

    </div>

  )}

</div>

      {/* EXPORT */}

      <div style={styles.exportSection}>

        <button
          style={styles.button}
          onClick={exportCSV}
        >

          Export CSV

        </button>

      </div>

    </div>

  );

}

// =====================================
// STYLES
// =====================================

const styles = {

  container: {

    background: "#08132b",

    minHeight: "100vh",

    padding: "20px",

    color: "white",

    fontFamily: "Arial"

  },

  title: {

    textAlign: "center",

    marginBottom: "30px"

  },

  kpiGrid: {

    display: "grid",

    gridTemplateColumns:
      "repeat(4,1fr)",

    gap: "20px",

    marginTop: "20px"

  },

  card: {

    background: "#1e2b45",

    padding: "20px",

    borderRadius: "10px",

    textAlign: "center"

  },

  chartGrid: {

    display: "grid",

    gridTemplateColumns:
      "1fr 1fr",

    gap: "20px",

    marginTop: "30px"

  },

  chartCard: {

    background: "#1e2b45",

    padding: "20px",

    borderRadius: "10px"

  },

  filterRow: {

    display: "flex",

    gap: "15px",

    marginTop: "30px"

  },

  input: {

    padding: "10px",

    borderRadius: "5px"

  },

  button: {

    background: "#2563eb",

    color: "white",

    border: "none",

    padding: "10px 20px",

    borderRadius: "5px",

    cursor: "pointer"

  },

  tableCard: {

    background: "#1e2b45",

    padding: "20px",

    borderRadius: "10px",

    marginTop: "30px",

    overflowX: "auto"

  },

  table: {

    width: "100%",

    marginTop: "20px",

    borderCollapse: "collapse"

  },


  predictionInput: {

    width: "100%",

    padding: "10px",

    marginBottom: "10px",

    borderRadius: "5px"

  },

 

  exportSection: {

    marginTop: "30px"

  },
  predictionCard: {
  backgroundColor: "#1e2a45",
  padding: "20px",
  borderRadius: "10px",
  marginTop: "30px",
},

formGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: "15px",
  marginTop: "20px",
},

resultBox: {
  backgroundColor: "#22c55e",
  padding: "20px",
  borderRadius: "10px",
  marginTop: "20px",
  color: "white",
  fontWeight: "bold",
  textAlign: "center",
},

};

export default App;