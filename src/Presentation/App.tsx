import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from "./Views/Home";
import Layout from './Views/Layout';
import TableView from './Views/TableView';
import AddColumn from './Views/AddColumn';
import EditColumn from './Views/EditColumn';

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
      </Routes>
    </BrowserRouter>
  );
}

export default App;
