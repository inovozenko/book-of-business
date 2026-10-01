# Frontend take-home

Advisors and their managers need to see how their book of business develops over time, and to drill from the whole company down to a single branch, advisor or acquisition channel.

Your task is a dashboard over the client data below, with two parts:

- A stacked bar chart showing the data over time.
- A table of the detail per month, with expandable rows that reveal the level beneath.

There is no scaffolding to clone. Start from an empty project and set it up as you see fit.

We have left parts of this brief open on purpose. Where you had to make a call, tell us what you assumed and why, including anything you think we got wrong.

## Design

The UI and behaviour should closely match the design: [Web engineer home task](https://www.figma.com/design/t6itC2qsmr3WLPugwrVdqS/Web-engineer-home-task?node-id=0-1&p=f&t=KTsn5GT1DLGjUX06-0).

## Requirements

- Use LLMs however you normally would.
- Use React and TypeScript.
- Serve the data from a Node.js REST API, and handle the loading and error states in the UI.
- Design component APIs the way you would on a real team: composable, with clear boundaries.
- Make it accessible. Expanding and collapsing rows has to work from the keyboard, and the hierarchy has to reach assistive technology.
- Test the UI, at least expand and collapse behaviour and how the data maps into the chart.
- Full responsiveness is not required, but nothing should break or overflow down to 375px.
- Use any CSS framework, charting library or state management library you like.
- Include a short README: how to run and test it, the assumptions and open questions from above, and what you would do next.
- Aim for about 6–8 hours. If you run out of time, ship the parts that matter most.

## Data model

The data is a tree: a company holds branches, a branch holds employees, and an employee holds acquisition channels. Every node has an `id`, a `name` and a `values` array of 12 monthly figures in order, running Feb 2024 to Jan 2025 in the design.

The nesting is not uniform. Branch 2 and Branch 3 have no employees, and only Anna Blackwood has channels. Your UI has to handle that.

Serve the payload below from your API. You can copy it straight out of this PDF.

```json
{
  "id": "d6e00056-dce4-4ef4-b034-d6467db6187d",
  "name": "Company",
  "values": [250, 267, 284, 301, 317, 334, 350, 250, 250, 250, 250, 350],
  "branches": [
    {
      "id": "d6b668e1-89a4-4467-bdf6-c9ebaf2cea5f",
      "name": "Branch 1",
      "values": [147, 157, 166, 156, 188, 201, 214, 147, 147, 147, 147, 214],
      "employees": [
        {
          "id": "e3c4637b-2f21-4b7e-883e-b13ae1a6df6a",
          "name": "Anna Blackwood",
          "values": [25, 26, 28, 31, 32, 34, 38, 27, 27, 27, 27, 38],
          "channels": [
            {
              "id": "716e7c30-b7c3-45c5-aa64-cbcf483917e0",
              "name": "Existing clients",
              "values": [25, 25, 26, 28, 31, 32, 34, 25, 25, 25, 25, 34]
            },
            {
              "id": "bc5cd63a-668b-4c37-854d-69c1bd5fcbcd",
              "name": "New organic",
              "values": [0, 1, 1, 1, 0, 2, 2, 1, 1, 1, 1, 2]
            },
            {
              "id": "abbf873a-a0eb-46b8-b4cf-dc58e5f7a2d7",
              "name": "New paid",
              "values": [0, 0, 1, 1, 2, 1, 0, 2, 1, 1, 1, 2]
            }
          ]
        },
        {
          "id": "afe9ebc0-6c35-4690-80b0-20e9bc0d8c7d",
          "name": "James Walker",
          "values": [12, 13, 14, 14, 15, 15, 16, 12, 12, 12, 12, 17]
        },
        {
          "id": "bb012770-02d3-4999-aa08-c11a9065235d",
          "name": "Maria Gutierrez",
          "values": [36, 39, 41, 22, 46, 48, 51, 35, 35, 35, 35, 52]
        },
        {
          "id": "61cd9425-2d8e-456f-b228-f7e7c6a76e5d",
          "name": "Robert Chen",
          "values": [42, 43, 46, 47, 51, 55, 58, 41, 41, 41, 41, 54]
        },
        {
          "id": "3e4efd29-e7e4-4695-a1dc-6f3b0853c19d",
          "name": "Sarah Smith",
          "values": [32, 36, 37, 42, 44, 49, 53, 32, 32, 32, 32, 53]
        }
      ]
    },
    {
      "id": "71da0b06-5785-4a60-9273-4df2be619ee4",
      "name": "Branch 2",
      "values": [76, 80, 84, 87, 90, 92, 94, 75, 75, 75, 75, 91]
    },
    {
      "id": "63b01d42-922f-43ff-b0f8-2f3484e74c43",
      "name": "Branch 3",
      "values": [27, 30, 34, 36, 39, 41, 42, 28, 28, 28, 28, 45]
    }
  ]
}
```
