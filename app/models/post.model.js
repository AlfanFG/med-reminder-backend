module.exports = (mongoose) => {
  const schema = mongoose.Schema(
    {
      medName: {
        type: String,
        required: false,
      },
      reminderTimes: {
        type: Number,
        required: false,
      },
      startDate: {
        type: Date,
        required: false,
      },
      duration: {
        type: String,
        required: false,
      },
      numberOfDays: {
        type: Number,
        required: false,
        default: 0,
      },
      schedule: [
        {
          time: {
            type: Date,
            required: false,
          },
          takePill: {
            type: Number,
            required: false,
          },
        },
      ],
    },
    { timestamps: true }
  );

  //   schema.method("toJSON", function () {
  //     const { __v, _id, ...object } = this.object();
  //     object.id = _id;
  //     return object;
  //   });

  const Post = mongoose.model("posts", schema);
  return Post;
};
