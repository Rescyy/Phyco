import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from "./Views/Home";
import Layout from './Views/Layout';
import TableView from './Views/TableView';
import AddColumn from './Views/Dialogs/AddColumn';
import EditColumn from './Views/Dialogs/EditColumn';
import DeleteColumn from './Views/Dialogs/DeleteColumn';
import ViewChart from './Views/Chart/ViewChart';
import AddChart from './Views/Dialogs/AddChart';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="table" element={<TableView />} />
        </Route>
        <Route path="addColumn" element={<AddColumn />} />
        <Route path="editColumn" element={<EditColumn />} />
        <Route path="deleteColumn" element={<DeleteColumn />} />
        <Route path="addChart" element={<AddChart />} />
        <Route path="viewChart" element={<ViewChart />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
