import { RouterProvider } from 'react-router-dom';
import { router } from '@/routes';
import { ToastContainer } from '@/shared/components/toast-container';

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer />
    </>
  )
}

export default App
