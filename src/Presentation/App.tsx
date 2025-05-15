import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from "./Views/Home";
import Layout from './Views/Layout';
import TableView from './Views/TableView';
import AddColumn from './Views/Dialogs/AddColumn';
import EditColumn from './Views/Dialogs/EditColumn';
import Test from './Views/Test';
import DeleteColumn from './Views/Dialogs/DeleteColumn';

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
        <Route path="deleteColumn" element={<DeleteColumn />}/>
        <Route path="test" element={<Test />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
