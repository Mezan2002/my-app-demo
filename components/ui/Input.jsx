const Input = ({ type = "text", name, placeholder, className, ...props }) => {
  return (
    <input
      type={type}
      name={name}
      placeholder={placeholder}
      className={`${className} border border-gray-300 p-2 rounded`}
      {...props}
    />
  );
};

export default Input;
