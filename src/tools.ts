export class Tools {

    public static getTimestamp(): string {
        let currentdate: Date = new Date();

        return currentdate.getFullYear() + "_"
            + ("0" + (currentdate.getMonth() + 1).toString()).slice(-2) + ""
            + ("0" + currentdate.getDate()).slice(-2) + "_"
            + ("0" + currentdate.getHours()).slice(-2) + ""
            + ("0" + currentdate.getMinutes()).slice(-2) + ""
            + ("0" + currentdate.getSeconds()).slice(-2);
    }

}