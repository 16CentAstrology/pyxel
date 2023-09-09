use std::cmp::min;
use std::ptr;

use pyo3::exceptions::PyAttributeError;
use pyo3::prelude::*;
use pyxel_engine as pyxel;

use crate::image_wrapper::wrap_pyxel_image;
use crate::pyxel_singleton::pyxel;

#[pyclass]
struct Colors;

impl Colors {
    fn list(&self) -> &[pyxel::Rgb8] {
        unsafe { &*ptr::addr_of!(*pyxel().colors) }
    }

    fn list_mut(&mut self) -> &mut [pyxel::Rgb8] {
        unsafe { &mut *ptr::addr_of_mut!(*pyxel().colors) }
    }
}

#[pymethods]
impl Colors {
    fn __len__(&self) -> PyResult<usize> {
        impl_len_method_for_list!(self)
    }

    fn __getitem__(&self, index: isize) -> PyResult<pyxel::Rgb8> {
        impl_getitem_method_for_list!(self, index)
    }

    fn __setitem__(&mut self, index: isize, value: pyxel::Rgb8) -> PyResult<()> {
        impl_setitem_method_for_list!(self, index, value)
    }

    pub fn from_list(&mut self, lst: Vec<pyxel::Rgb8>) {
        let copy_size = min(self.list().len(), lst.len());
        self.list_mut()[..copy_size].clone_from_slice(&lst[..copy_size]);
    }

    pub fn to_list(&self) -> PyResult<Vec<pyxel::Rgb8>> {
        impl_to_list_method_for_list!(self)
    }
}

#[pyfunction]
fn __getattr__(py: Python, name: &str) -> PyResult<PyObject> {
    let value = match name {
        // System
        "width" => pyxel().width.to_object(py),
        "height" => pyxel().height.to_object(py),
        "frame_count" => pyxel().frame_count.to_object(py),

        // Input
        "mouse_x" => pyxel().mouse_x.to_object(py),
        "mouse_y" => pyxel().mouse_y.to_object(py),
        "mouse_wheel" => pyxel().mouse_wheel.to_object(py),
        "input_text" => pyxel().input_text.to_object(py),
        "dropped_files" => pyxel().dropped_files.to_object(py),

        // Graphics
        "colors" => Py::new(py, Colors)?.into_py(py),
        "screen" => wrap_pyxel_image(pyxel().screen.clone()).into_py(py),
        "cursor" => wrap_pyxel_image(pyxel().cursor.clone()).into_py(py),
        "font" => wrap_pyxel_image(pyxel().font.clone()).into_py(py),

        // Others
        _ => {
            return Err(PyAttributeError::new_err(format!(
                "module 'pyxel' has no attribute '{name}'"
            )))
        }
    };
    Ok(value)
}

pub fn add_module_variables(m: &PyModule) -> PyResult<()> {
    m.add_class::<Colors>()?;
    m.add_function(wrap_pyfunction!(__getattr__, m)?)?;
    Ok(())
}
