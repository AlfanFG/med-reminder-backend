module.exports = (mongoose) => {
  const schema = mongoose.Schema(
    {
      name: {
        type: String,
        required: false,
      },
      email: {
        type: String,
        required: false,
      },
      phone_number: {
        type: String,
        required: false,
      },
      password: {
        type: String,
        required: false,
      },
      uuid: {
        type: String,
        required: false,
      },
    },
    { timestamps: true }
  );

  //   schema.method("toJSON", function () {
  //     const { __v, _id, ...object } = this.object();
  //     object.id = _id;
  //     return object;
  //   });

  const User = mongoose.model("users", schema);
  return User;
};
